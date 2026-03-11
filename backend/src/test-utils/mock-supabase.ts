/**
 * Shared mock factory for Supabase client.
 * All services use supabase.getClient().from('table').select/insert/update...
 */

export function createMockQueryBuilder(dataOrResolved: any = null, error: any = null, count?: number) {
  const resolvedValue = (dataOrResolved !== null && typeof dataOrResolved === 'object' && 'data' in dataOrResolved && 'error' in dataOrResolved)
    ? dataOrResolved
    : { data: dataOrResolved, error, count };
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  // Make terminal-less chains also resolve
  // Allow overriding the resolved value after chaining
  builder.mockResolvedValue = (val: any) => {
    builder.single.mockResolvedValue(val);
    // Also allow the builder itself to resolve (for non-single queries)
    Object.defineProperty(builder, 'then', {
      value: (resolve: any) => resolve(val),
      writable: true,
      configurable: true,
    });
    return builder;
  };
  builder.mockResolve = builder.mockResolvedValue;
  return builder;
}

export function createMockSupabaseClient() {
  const queryBuilder = createMockQueryBuilder();

  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
        getUserById: jest.fn().mockResolvedValue({ data: { user: { email: 'test@test.com' } } }),
      },
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: {}, session: { access_token: 'token' } }, error: null }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.jpg' } }),
      }),
    },
    _queryBuilder: queryBuilder,
  };
}

export function createMockSupabaseService() {
  const client = createMockSupabaseClient();
  const anonClient = createMockSupabaseClient();
  return {
    getClient: jest.fn().mockReturnValue(client),
    getAdminClient: jest.fn().mockReturnValue(client),
    getAnonClient: jest.fn().mockReturnValue(anonClient),
    _client: client,
    _anonClient: anonClient,
  };
}
