import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { EmployeeRole } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(EmployeeRole)
  role: EmployeeRole;
}
