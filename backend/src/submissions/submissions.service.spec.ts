import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { WimcGateway } from '../gateway/wimc.gateway';
import { createMockSupabaseService } from '../test-utils/mock-supabase';
import { createMockEmailService, createMockGateway } from '../test-utils/mock-services';

/**
 * Helper: creates a sequential mock Supabase client where each `.from(table)`
 * call returns the next query-builder in the provided array (FIFO per table).
 */
function buildSequentialClient(calls: Array<{ table: string; result: any }>) {
  const queue = [...calls];

  const client = {
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({ data: { user: { email: 'test@test.com' } } }),
      },
    },
    from: jest.fn().mockImplementation((table: string) => {
      const idx = queue.findIndex((c) => c.table === table);
      const entry = idx !== -1 ? queue.splice(idx, 1)[0] : undefined;
      const result = entry?.result ?? { data: null, error: null };

      const builder: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(result),
        maybeSingle: jest.fn().mockResolvedValue(result),
        then: (resolve: any) => Promise.resolve(result).then(resolve),
      };

      return builder;
    }),
  };

  return client;
}

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let supabaseService: ReturnType<typeof createMockSupabaseService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let gateway: ReturnType<typeof createMockGateway>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService();
    emailService = createMockEmailService();
    gateway = createMockGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: EmailService, useValue: emailService },
        { provide: WimcGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── ensureSellerProfile ───────────────────────────────────────────

  describe('ensureSellerProfile', () => {
    it('should upgrade a buyer to seller and create seller_profile', async () => {
      const userId = 'user-buyer-1';

      const client = buildSequentialClient([
        { table: 'wimc_profiles', result: { data: { id: userId, role: 'buyer' }, error: null } },
        { table: 'wimc_profiles', result: { data: { id: userId, role: 'seller' }, error: null } },
        { table: 'wimc_seller_profiles', result: { data: null, error: null } },
        { table: 'wimc_seller_profiles', result: { data: { user_id: userId, tier: 'bronze', points: 0 }, error: null } },
      ]);

      supabaseService.getClient.mockReturnValue(client);
      await service.ensureSellerProfile(userId);
      expect(client.from).toHaveBeenCalledWith('wimc_profiles');
      expect(client.from).toHaveBeenCalledWith('wimc_seller_profiles');
    });

    it('should be a no-op for an existing seller', async () => {
      const userId = 'user-seller-1';
      const client = buildSequentialClient([
        { table: 'wimc_profiles', result: { data: { id: userId, role: 'seller' }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await service.ensureSellerProfile(userId);
      expect(client.from).toHaveBeenCalledTimes(1);
    });

    it('should be a no-op for an admin user', async () => {
      const userId = 'user-admin-1';
      const client = buildSequentialClient([
        { table: 'wimc_profiles', result: { data: { id: userId, role: 'admin' }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await service.ensureSellerProfile(userId);
      expect(client.from).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when profile is not found', async () => {
      const client = buildSequentialClient([
        { table: 'wimc_profiles', result: { data: null, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.ensureSellerProfile('missing-user')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const sellerId = 'seller-1';
    const dto = {
      brand: 'Chanel',
      name: 'Classic Flap',
      category: 'bags',
      condition: 'excellent',
      description: 'Pristine condition, comes with box and dust bag',
      user_photos: ['photo1.jpg'],
    };

    it('should insert a submission with stage pending_review and add an event', async () => {
      const submissionId = 'sub-new-1';
      const submissionData = { id: submissionId, ...dto, seller_id: sellerId, stage: 'pending_review' };

      const client = buildSequentialClient([
        // 1. insert submission
        { table: 'wimc_submissions', result: { data: submissionData, error: null } },
        // 2. addEvent insert
        { table: 'wimc_submission_events', result: { data: { id: 'evt-1' }, error: null } },
      ]);

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.create(sellerId, dto);

      expect(result.stage).toBe('pending_review');
      expect(result.seller_id).toBe(sellerId);
    });

    it('should throw when submission insert fails', async () => {
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: null, error: { message: 'insert failed' } } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.create(sellerId, dto)).rejects.toThrow();
    });

    it('should emit a websocket event to admin room after creation', async () => {
      const submissionId = 'sub-ws-1';
      const submissionData = { id: submissionId, ...dto, seller_id: sellerId, stage: 'pending_review' };

      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: submissionData, error: null } },
        { table: 'wimc_submission_events', result: { data: { id: 'evt-2' }, error: null } },
      ]);

      supabaseService.getClient.mockReturnValue(client);
      await service.create(sellerId, dto);

      expect(gateway.emitToAdmin).toHaveBeenCalledWith(
        'submission:new',
        expect.objectContaining({ id: submissionId }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────

  describe('getById', () => {
    const submissionId = 'sub-100';
    const sellerId = 'seller-owner';

    it('should allow the owner to access their submission', async () => {
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: submissionId, seller_id: sellerId, stage: 'pending_review', wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      const result = await service.getById(submissionId, sellerId, false);
      expect(result.id).toBe(submissionId);
    });

    it('should allow admin to access any submission', async () => {
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: submissionId, seller_id: sellerId, stage: 'pending_review', wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      const result = await service.getById(submissionId, 'admin-user-99', true);
      expect(result.id).toBe(submissionId);
    });

    it('should throw ForbiddenException when non-owner non-admin accesses', async () => {
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: submissionId, seller_id: sellerId, stage: 'pending_review', wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.getById(submissionId, 'stranger-id', false)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── adminReview ───────────────────────────────────────────────────

  describe('adminReview', () => {
    const adminId = 'admin-1';
    const subId = 'sub-review-1';

    it('should approve with proposed price and move to price_suggested', async () => {
      const subData = { id: subId, stage: 'pending_review', seller_id: 'seller-x', name: 'Item', wimc_submission_events: [] };
      const updatedData = { id: subId, stage: 'price_suggested', proposed_price: 30000, seller_id: 'seller-x', name: 'Item', wimc_submission_events: [] };

      const client = buildSequentialClient([
        // 1. updateStage -> getById (validate stage)
        { table: 'wimc_submissions', result: { data: subData, error: null } },
        // 2. updateStage -> update
        { table: 'wimc_submissions', result: { data: null, error: null } },
        // 3. updateStage -> addEvent
        { table: 'wimc_submission_events', result: { data: { id: 'evt-r1' }, error: null } },
        // 4. updateStage -> getById (return updated)
        { table: 'wimc_submissions', result: { data: updatedData, error: null } },
        // 5. adminReview -> getById (for email)
        { table: 'wimc_submissions', result: { data: updatedData, error: null } },
        // 6. getAdminEmails -> from('wimc_profiles')
        { table: 'wimc_profiles', result: { data: [], error: null } },
      ]);

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.adminReview(subId, adminId, 'approve', { proposed_price: 30000 });
      expect(result.stage).toBe('price_suggested');
      expect(result.proposed_price).toBe(30000);
    });

    it('should reject with reason and move to rejected', async () => {
      const subData = { id: subId, stage: 'pending_review', seller_id: 'seller-x', wimc_submission_events: [] };
      const rejectedData = { id: subId, stage: 'rejected', rejection_reason: 'Item not authentic', seller_id: 'seller-x', wimc_submission_events: [] };

      const client = buildSequentialClient([
        // 1. updateStage -> getById
        { table: 'wimc_submissions', result: { data: subData, error: null } },
        // 2. updateStage -> update
        { table: 'wimc_submissions', result: { data: null, error: null } },
        // 3. updateStage -> addEvent
        { table: 'wimc_submission_events', result: { data: { id: 'evt-r2' }, error: null } },
        // 4. updateStage -> getById (return updated)
        { table: 'wimc_submissions', result: { data: rejectedData, error: null } },
      ]);

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.adminReview(subId, adminId, 'reject', { rejection_reason: 'Item not authentic' });
      expect(result.stage).toBe('rejected');
    });

    it('should throw BadRequestException if submission is not in pending_review stage', async () => {
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: subId, stage: 'price_accepted', seller_id: 'seller-x', wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.adminReview(subId, adminId, 'approve', { proposed_price: 20000 })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Stage transitions ────────────────────────────────────────────

  describe('stage transitions', () => {
    const adminId = 'admin-1';
    const sellerId = 'seller-1';

    /**
     * Helper that builds mock entries for methods that go through updateStage.
     * updateStage flow: getById -> validate -> update -> addEvent -> getById (return)
     */
    function stageTransitionEntries(subId: string, currentStage: string, newStage: string, extraFields: Record<string, any> = {}) {
      const base = { id: subId, seller_id: sellerId, name: 'Test Item', wimc_submission_events: [] };
      return [
        // 1. getById (validate current stage)
        { table: 'wimc_submissions', result: { data: { ...base, stage: currentStage }, error: null } },
        // 2. update
        { table: 'wimc_submissions', result: { data: null, error: null } },
        // 3. addEvent
        { table: 'wimc_submission_events', result: { data: { id: 'evt-1' }, error: null } },
        // 4. getById (return updated)
        { table: 'wimc_submissions', result: { data: { ...base, stage: newStage, ...extraFields }, error: null } },
      ];
    }

    it('acceptPrice should move from price_suggested to price_accepted', async () => {
      const subId = 'sub-ap-1';
      const base = { id: subId, seller_id: sellerId, name: 'Test', stage: 'price_suggested', wimc_submission_events: [] };

      const client = buildSequentialClient([
        // 1. acceptPrice -> getById (validate stage == price_suggested)
        { table: 'wimc_submissions', result: { data: base, error: null } },
        // 2-5. updateStage flow
        ...stageTransitionEntries(subId, 'price_suggested', 'price_accepted'),
        // 6. getAdminEmails -> wimc_profiles
        { table: 'wimc_profiles', result: { data: [], error: null } },
      ]);

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.acceptPrice(subId, sellerId);
      expect(result.stage).toBe('price_accepted');
    });

    it('rejectPrice should throw if stage is not price_suggested', async () => {
      const subId = 'sub-rp-bad';
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: subId, stage: 'pending_review', seller_id: sellerId, wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.rejectPrice(subId, sellerId)).rejects.toThrow(BadRequestException);
    });

    it('dispatchDriver should move from pickup_scheduled to driver_dispatched', async () => {
      const subId = 'sub-dd-1';
      const client = buildSequentialClient(
        stageTransitionEntries(subId, 'pickup_scheduled', 'driver_dispatched'),
      );
      supabaseService.getClient.mockReturnValue(client);
      const result = await service.dispatchDriver(subId, adminId);
      expect(result.stage).toBe('driver_dispatched');
    });

    it('arrivedAtOffice should move from driver_dispatched to arrived_at_office', async () => {
      const subId = 'sub-ao-1';
      const client = buildSequentialClient(
        stageTransitionEntries(subId, 'driver_dispatched', 'arrived_at_office'),
      );
      supabaseService.getClient.mockReturnValue(client);
      const result = await service.arrivedAtOffice(subId, adminId);
      expect(result.stage).toBe('arrived_at_office');
    });

    it('qcResult passed should move from arrived_at_office to auth_passed', async () => {
      const subId = 'sub-qc-pass';
      const base = { id: subId, seller_id: sellerId, name: 'Test', stage: 'arrived_at_office', wimc_submission_events: [] };

      const client = buildSequentialClient([
        // 1. qcResult -> getById
        { table: 'wimc_submissions', result: { data: base, error: null } },
        // 2-5. updateStage flow
        ...stageTransitionEntries(subId, 'arrived_at_office', 'auth_passed'),
      ]);

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.qcResult(subId, adminId, true, 'All checks passed');
      expect(result.stage).toBe('auth_passed');
    });

    it('qcResult failed should move to auth_failed and send failure email', async () => {
      const subId = 'sub-qc-fail';
      const base = { id: subId, seller_id: sellerId, name: 'Test', stage: 'arrived_at_office', wimc_submission_events: [] };

      const client = buildSequentialClient([
        // 1. qcResult -> getById
        { table: 'wimc_submissions', result: { data: base, error: null } },
        // 2-5. updateStage flow
        ...stageTransitionEntries(subId, 'arrived_at_office', 'auth_failed'),
      ]);

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.qcResult(subId, adminId, false, 'Stitching inconsistency');
      expect(result.stage).toBe('auth_failed');

      // sendAuthFailed is called inside a fire-and-forget .then().catch() chain,
      // so we need to flush the microtask queue before asserting.
      await new Promise(resolve => setImmediate(resolve));
      expect(emailService.sendAuthFailed).toHaveBeenCalled();
    });

    it('photoshootDone should update photos and move from auth_passed to photoshoot_done', async () => {
      const subId = 'sub-ps-1';
      const proPhotos = ['https://cdn.wimc.com/photo1.jpg', 'https://cdn.wimc.com/photo2.jpg'];
      const proDescription = 'Professional luxury photography complete';

      const client = buildSequentialClient(
        stageTransitionEntries(subId, 'auth_passed', 'photoshoot_done', { pro_photos: proPhotos, pro_description: proDescription }),
      );

      supabaseService.getClient.mockReturnValue(client);
      const result = await service.photoshootDone(subId, adminId, proPhotos, proDescription);
      expect(result.stage).toBe('photoshoot_done');
      expect(result.pro_photos).toEqual(proPhotos);
    });
  });

  // ─── stage validation (via public methods) ─────────────────────────

  describe('stage validation via public methods', () => {
    it('should throw BadRequestException when dispatchDriver is called on wrong stage', async () => {
      const subId = 'sub-us-bad';
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: subId, stage: 'pending_review', seller_id: 'seller-1', wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.dispatchDriver(subId, 'actor-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when arrivedAtOffice is called on wrong stage', async () => {
      const subId = 'sub-us-bad2';
      const client = buildSequentialClient([
        { table: 'wimc_submissions', result: { data: { id: subId, stage: 'pending_review', seller_id: 'seller-1', wimc_submission_events: [] }, error: null } },
      ]);
      supabaseService.getClient.mockReturnValue(client);
      await expect(service.arrivedAtOffice(subId, 'actor-1')).rejects.toThrow(BadRequestException);
    });
  });
});
