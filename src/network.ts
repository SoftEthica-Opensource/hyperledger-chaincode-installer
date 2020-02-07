import * as fs from 'fs';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { Logger } from '@nestjs/common';
import { FabricConnectionFactory } from './fabric-client/connection-factory';
import { ChainCodeModel } from './chainCode.model';
import { Proposal, ProposalErrorResponse, ProposalResponse } from 'fabric-client';

export class Network {

  organization(membershipServiceProviderIdentifier: string) {
    return {
      manage: (organizationAdministrator: any) => {
        return {
          installChainCode: async (chainCodeDefinition: ChainCodeModel) => {

            const networkConnectionConfigurationFile
              = fs.readFileSync('networks/' + membershipServiceProviderIdentifier + '/connection.yaml').toString();
            const networkConnectionConfiguration = yaml.load(networkConnectionConfigurationFile);

            // Load channel data
            const channelDefinition = {
              name: undefined,
            };
            channelDefinition.name = Object.keys(networkConnectionConfiguration.channels)[0];

            // Load the certificate authority data
            const certificateAuthority = {
              name: undefined,
              uri: undefined,
            };
            certificateAuthority.name = Object.keys(networkConnectionConfiguration.certificateAuthorities)[0];
            certificateAuthority.uri = networkConnectionConfiguration.certificateAuthorities[certificateAuthority.name];

            // Connect to the HyperLedger Fabric network
            const connectionFactory = new FabricConnectionFactory(os.tmpdir(), 'networks/' + membershipServiceProviderIdentifier);
            const networkConnection = await connectionFactory
              .connect(membershipServiceProviderIdentifier,
                certificateAuthority,
                organizationAdministrator);
            Logger.log('Connected to HyperLedger Fabric', 'HyperLedger Fabric Network');

            const gateway = await networkConnection
              .gateway(membershipServiceProviderIdentifier, 'networks/' + membershipServiceProviderIdentifier, organizationAdministrator.logOn);
            Logger.log('Gateway connected to a network', 'HyperLedger Fabric Network');

            const client = gateway.getClient();
            const peers = client.getPeersForOrg(membershipServiceProviderIdentifier);

            // Install the given chain-code
            const result = await client.installChaincode({
              targets: peers,
              // TODO: This is a dirty fix for HL's original code
              chaincodePath: '../chaincodes/' + chainCodeDefinition.name + '/',
              chaincodeId: chainCodeDefinition.identifier,
              chaincodeVersion: chainCodeDefinition.version,
              chaincodeType: 'golang',
              channelNames: [channelDefinition.name],
            });

            // Parse response
            const response = result['0']['0'];
            if (500 === response.status) {
              Logger.log(response.message, 'HyperLedger Fabric Network');
              return {
                status: false,
              };
            } else if (200 === response.response.status) {
              Logger.log('Deployed chain-code', 'HyperLedger Fabric Network');

              // We need to know peers, to which the chain-code was installed,
              // to be able to connect to these peers later.
              return {
                status: true,
                peers,
              };
            } else {
              throw Error(JSON.stringify(result));
            }
          },
          instantiateChainCode: async (chainCodeDefinition: ChainCodeModel) => {

            const networkConnectionConfigurationFile
              = fs.readFileSync('networks/' + membershipServiceProviderIdentifier + '/connection.yaml').toString();
            const networkConnectionConfiguration = yaml.load(networkConnectionConfigurationFile);

            // Load channel data
            const channelDefinition = {
              name: undefined,
            };
            channelDefinition.name = Object.keys(networkConnectionConfiguration.channels)[0];

            // Load the certificate authority data
            const certificateAuthority = {
              name: undefined,
              uri: undefined,
            };
            certificateAuthority.name = Object.keys(networkConnectionConfiguration.certificateAuthorities)[0];
            certificateAuthority.uri = networkConnectionConfiguration.certificateAuthorities[certificateAuthority.name];

            // Connect to the HyperLedger Fabric network
            const connectionFactory = new FabricConnectionFactory(os.tmpdir(), 'networks/' + membershipServiceProviderIdentifier);
            const networkConnection = await connectionFactory
              .connect(membershipServiceProviderIdentifier,
                certificateAuthority,
                organizationAdministrator);
            Logger.log('Connected to HyperLedger Fabric', 'HyperLedger Fabric Network');

            const gateway = await networkConnection
              .gateway(membershipServiceProviderIdentifier, 'networks/' + membershipServiceProviderIdentifier, organizationAdministrator.logOn);
            Logger.log('Gateway connected to a network', 'HyperLedger Fabric Network');

            const client = gateway.getClient();
            const channel = client.getChannel();

            const proposalResponse = await channel.sendInstantiateProposal({
              chaincodeId: chainCodeDefinition.name,
              chaincodeVersion: chainCodeDefinition.version,
              fcn: 'init',
              args: [],
              txId: client.newTransactionID(true),
            });

            const error = proposalResponse[0][0] as ProposalErrorResponse;
            if (!(error instanceof Error)) {

              const transactionResponse = await channel.sendTransaction({
                proposalResponses: proposalResponse[0] as ProposalResponse[],
                proposal: proposalResponse[1] as Proposal,
              });

              Logger.log('Chain-code instantiated: ' + JSON.stringify(transactionResponse), 'HyperLedger Fabric Network');
              return true;
            } else {
              Logger.log('Error sending the instantiate proposal: ' + error, 'HyperLedger Fabric Network');
              return false;
            }
          },
        };
      },
    };
  }
}
