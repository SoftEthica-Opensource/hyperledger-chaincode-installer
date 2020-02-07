import { MSPModel } from '../msp.model';
import { AdministratorModel } from '../administrator.model';
import { ChainCodeModel } from '../chainCode.model';

export class ChainCodeInstallRequest {
  msp: MSPModel;
  administrator: AdministratorModel;
  chainCode: ChainCodeModel;
}
