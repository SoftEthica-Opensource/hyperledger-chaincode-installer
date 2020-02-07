import * as FabricNetwork from 'fabric-network';
import FabricCAServices = require('fabric-ca-client');
import { FabricConnection } from './connection';

export class FabricUserContext {

  user: any;
  enrollment: FabricCAServices.IEnrollResponse;
  connection: FabricConnection;
  logOn: string;

  constructor(connection: FabricConnection, logOn: string) {
    this.connection = connection;
    this.logOn = logOn;
  }

  // Exports user context into format suitable for the Fabric Network library
  async export(storePath: string, mspId: string) {
    const wallet = new FabricNetwork.FileSystemWallet(storePath);
    const identity = FabricNetwork.X509WalletMixin.createIdentity(mspId, this.enrollment.certificate, this.enrollment.key.toBytes());
    await wallet.import(this.logOn, identity);
  }

  // Loads a user context from the CA server
  async load(membershipServiceProviderName: string, password: string): Promise<FabricUserContext> {

    // Need to enroll it with the CA server
    this.enrollment = await this.connection.fabricCAClient.enroll({
      enrollmentID: this.logOn,
      enrollmentSecret: password,
    });
    const options = {
      username: this.logOn,
      mspid: membershipServiceProviderName,
      cryptoContent: {
        privateKeyPEM: this.enrollment.key.toBytes(),
        signedCertPEM: this.enrollment.certificate,
      },
    };

    this.user = await this.connection.fabricClient.createUser(options);
    await this.connection.fabricClient.setUserContext(this.user);
    return this;
  }

  async registerChild(membershipServiceProviderName: string, affiliation: string, logOn: string): Promise<FabricUserContext> {

    const userContext = new FabricUserContext(this.connection, logOn);

    const secret = await this.connection.fabricCAClient.register({
      enrollmentID: logOn,
      affiliation: affiliation,
    }, this.user);
    userContext.enrollment = await this.connection.fabricCAClient.enroll({
      enrollmentID: logOn,
      enrollmentSecret: secret,
    });
    const options = {
      username: logOn,
      mspid: membershipServiceProviderName,
      cryptoContent: {
        privateKeyPEM: userContext.enrollment.key.toBytes(),
        signedCertPEM: userContext.enrollment.certificate,
      },
    };
    userContext.user = await this.connection.fabricClient.createUser(options);

    await this.connection.fabricClient.setUserContext(userContext.user);
    return userContext;
  }

  // Opens a user context from the local wallet
  async open() {
    this.user = await this.connection.fabricClient.getUserContext(this.logOn, true);
    return this.user;
  }
}
