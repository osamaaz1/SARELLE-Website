import { IsString, IsOptional } from 'class-validator';

export class ProposePickupDto {
  @IsString()
  pickup_date: string;

  @IsString()
  pickup_time_from: string;

  @IsString()
  pickup_time_to: string;

  @IsString()
  pickup_address: string;

  @IsString()
  driver_phone: string;

  @IsString()
  whatsapp_number: string;

  @IsOptional()
  @IsString()
  google_maps_link?: string;
}

export class RespondToPickupDto {
  @IsString()
  action: 'accept' | 'reject' | 'cancel';

  @IsOptional()
  @IsString()
  admin_suggested_date?: string;

  @IsOptional()
  @IsString()
  admin_suggested_time_from?: string;

  @IsOptional()
  @IsString()
  admin_suggested_time_to?: string;

  @IsOptional()
  @IsString()
  admin_pickup_notes?: string;
}
