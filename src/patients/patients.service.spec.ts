import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from './patients.service';

jest.mock('./patient-avatar.storage', () => ({
  savePatientAvatar: jest.fn().mockResolvedValue('/uploads/patients/patient-1.jpg'),
}));

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: {
    patient: {
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PatientsService);
  });

  it('cria paciente com therapist_id do token', async () => {
    const createdAt = new Date('2026-07-21T19:00:00.000Z');
    prisma.patient.create.mockResolvedValue({
      id: 'patient-1',
      fullName: 'Maria Silva',
      age: 72,
      gender: 'feminino',
      contact: '(82) 9 9999-9999',
      schoolingBand: '5_8_anos',
      avatarUrl: null,
      createdAt,
    });

    const result = await service.create('therapist-1', {
      fullName: 'Maria Silva',
      age: 72,
      gender: 'feminino',
      contact: '(82) 9 9999-9999',
      schoolingBand: '5_8_anos',
    });

    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: {
        therapistId: 'therapist-1',
        fullName: 'Maria Silva',
        age: 72,
        gender: 'feminino',
        contact: '(82) 9 9999-9999',
        schoolingBand: '5_8_anos',
      },
    });
    expect(result.id).toBe('patient-1');
    expect(result.fullName).toBe('Maria Silva');
  });

  it('lista pacientes filtrados por therapist_id', async () => {
    const createdAt = new Date('2026-07-21T19:00:00.000Z');
    prisma.patient.count.mockResolvedValue(1);
    prisma.patient.findMany.mockResolvedValue([
      {
        id: 'patient-1',
        fullName: 'Maria Silva',
        age: 72,
        gender: 'feminino',
        contact: '(82) 9 9999-9999',
        schoolingBand: null,
        avatarUrl: null,
        createdAt,
      },
    ]);

    const result = await service.list('therapist-1', {
      page: 1,
      limit: 25,
      sortBy: 'fullName',
      sortOrder: 'asc',
    });

    expect(prisma.patient.count).toHaveBeenCalledWith({
      where: { therapistId: 'therapist-1' },
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('findById retorna paciente do therapist ou lança 404', async () => {
    const createdAt = new Date('2026-07-21T19:00:00.000Z');
    prisma.patient.findFirst.mockResolvedValue({
      id: 'patient-1',
      fullName: 'Maria Silva',
      age: 72,
      gender: 'feminino',
      contact: '(82) 9 9999-9999',
      schoolingBand: null,
      avatarUrl: null,
      createdAt,
    });

    const result = await service.findById('therapist-1', 'patient-1');

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'patient-1', therapistId: 'therapist-1' },
    });
    expect(result.fullName).toBe('Maria Silva');

    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.findById('therapist-1', 'missing')).rejects.toThrow('Paciente não encontrado.');
  });
});
