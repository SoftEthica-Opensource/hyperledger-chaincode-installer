import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as FabricNetwork from 'fabric-network';
import { FabricUserContext } from './user-context';

export class FabricConnection {

  fabricClient: any;
  fabricCAClient: any;

  constructor(fabricClient: any, fabricCAClient: any) {
    this.fabricClient = fabricClient;
    this.fabricCAClient = fabricCAClient;
  }

  userContext(logOn: string) {
    return new FabricUserContext(this, logOn);
  }

  async gateway(membershipServiceProviderIdentifier: string, networkStorePath: string, identityIdentifier: string) {
    const gateway = new FabricNetwork.Gateway();
    const wallet = new FabricNetwork.FileSystemWallet(networkStorePath);
    const connectionProfile = yaml.safeLoad(fs.readFileSync(networkStorePath + '/connection.yaml', 'utf8'));
    await gateway.connect(connectionProfile, { wallet, identity: identityIdentifier });

    const client = gateway.getClient();

    function firstFile(folder: string) {
      const files = fs.readdirSync(folder);
      return folder + '/' + files[0];
    }

    const administratorPrivateKey = fs.readFileSync(firstFile('./' + networkStorePath + '/msp/keystore')).toString();
    const administratorPublicKey = fs.readFileSync(firstFile('./' + networkStorePath + '/msp/signcerts')).toString();
    client.setAdminSigningIdentity(administratorPrivateKey, administratorPublicKey, membershipServiceProviderIdentifier);

    return gateway;
  }
}
