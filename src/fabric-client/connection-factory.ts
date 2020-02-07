import * as FabricClient from 'fabric-client';
import * as FabricCAClient from 'fabric-ca-client';
import { FabricConnection } from './connection';

export class FabricConnectionFactory {

  certificateStorePath: string;
  networkStorePath: string;

  constructor(certificateStorePath: string, networkStorePath: string) {
    this.certificateStorePath = certificateStorePath;
    this.networkStorePath = networkStorePath;
  }

  async connect(membershipServiceProviderIdentifier: string, certificateAuthority: any, administrator: any) {

    // New key store
    const keyValueStore = await FabricClient.newDefaultKeyValueStore({
      path: this.certificateStorePath,
    });

    // New Fabric client
    const fabricClient = new FabricClient();
    fabricClient.setStateStore(keyValueStore);
    const cryptoSuite = FabricClient.newCryptoSuite();

    // Use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    const cryptoKeyStore = FabricClient.newCryptoKeyStore({ path: this.certificateStorePath });
    cryptoSuite.setCryptoKeyStore(cryptoKeyStore);
    fabricClient.setCryptoSuite(cryptoSuite);
    const tlsOptions: FabricCAClient.TLSOptions = {
      trustedRoots: new Buffer(0),
      verify: false,
    };

    // New Fabric CA client
    const fabricCAClient = new FabricCAClient(certificateAuthority.uri, tlsOptions, certificateAuthority.name, cryptoSuite);

    // New Fabric connection
    const fabricConnection = new FabricConnection(fabricClient, fabricCAClient);

    // Administrator user context
    const userContext = fabricConnection.userContext(administrator.logOn);
    const user = await userContext.open();
    if (!user || !user.isEnrolled()) {
      await userContext.load(membershipServiceProviderIdentifier, administrator.password);
      await userContext.export(this.networkStorePath, membershipServiceProviderIdentifier);
    }

    return fabricConnection;
  }
}
