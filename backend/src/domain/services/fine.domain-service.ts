import { Injectable, Inject } from "@nestjs/common";
import { Fine, FineProps } from "../entities/fine.entity";
import { IFineRepository } from "../repositories/fine.repository.interface";
import { FINE_REPOSITORY } from "../repositories/tokens";
import { FineStatus } from "../enums";

export interface CreateFineParams {
  borrowingId: string;
  userId: string;
  amount: number;
  reason: string;
}

export interface PayFineParams {
  fineId: string;
  userId: string;
  amount: number;
}

export interface WaiveFineParams {
  fineId: string;
  reason?: string;
}

@Injectable()
export class FineDomainService {
  constructor(
    @Inject(FINE_REPOSITORY)
    private readonly fineRepo: IFineRepository,
  ) {}

  async createFine(
    params: CreateFineParams,
  ): Promise<{ fine: Fine; message: string }> {
    const fineProps: FineProps = {
      id: crypto.randomUUID(),
      borrowingId: params.borrowingId,
      userId: params.userId,
      amount: params.amount,
      reason: params.reason,
      status: FineStatus.UNPAID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const fine = new Fine(fineProps);
    const saved = await this.fineRepo.save(fine);

    return { fine: saved, message: "Fine created successfully" };
  }

  async payFine(
    params: PayFineParams,
  ): Promise<{ fine: Fine; message: string }> {
    const fine = await this.fineRepo.findById(params.fineId);
    if (!fine) {
      throw new Error("Fine not found");
    }

    if (fine.userId !== params.userId) {
      throw new Error("You can only pay your own fines");
    }

    if (fine.isPaid()) {
      throw new Error("This fine has already been fully paid");
    }

    fine.pay(params.amount);
    const updated = await this.fineRepo.update(fine);

    return {
      fine: updated,
      message: updated.isPaid()
        ? "Fine paid in full"
        : "Partial payment recorded",
    };
  }

  async waiveFine(
    params: WaiveFineParams,
  ): Promise<{ fine: Fine; message: string }> {
    const fine = await this.fineRepo.findById(params.fineId);
    if (!fine) {
      throw new Error("Fine not found");
    }

    if (fine.isPaid()) {
      throw new Error("Cannot waive a paid fine");
    }

    fine.waive();
    const updated = await this.fineRepo.update(fine);

    return {
      fine: updated,
      message: "Fine waived successfully",
    };
  }

  async getUserFineSummary(
    userId: string,
  ): Promise<{ totalUnpaid: number; fineCount: number }> {
    const unpaidAmount = await this.fineRepo.getTotalUnpaidByUserId(userId);
    const { fines } = await this.fineRepo.findByUserId(userId, {
      status: "UNPAID",
    });

    return {
      totalUnpaid: unpaidAmount,
      fineCount: fines.length,
    };
  }
}
