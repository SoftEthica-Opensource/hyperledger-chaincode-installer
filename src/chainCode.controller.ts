import * as fs from 'fs';
import * as uuid from 'uuid/v4';
import * as archiver from 'archiver';
import { Body, Controller, Get, Logger, Param, Post, Res } from '@nestjs/common';
import { Network } from './network';
import { Response } from 'express';
import { ChainCodeModel } from './chainCode.model';
import { ChainCodeInstallRequest } from './requests/chainCode.install';
import { ChainCodeInstantiateRequest } from './requests/chainCode.instantiate';

@Controller('chainCode')
export class ChainCodeController {

  @Get('package/:identifier')
  async download(@Param('identifier') identifier: string, @Res() response: Response) {

    Logger.log('Will handle download for chain-code ' + identifier, 'Chain-code Web API end-point');

    const downloadPackage = fs.createReadStream('./packages/' + identifier + '.zip');

    response.set({
      'Content-Type': 'application/zip',
    });

    downloadPackage.pipe(response);
  }

  @Post('install')
  async install(@Body() body: ChainCodeInstallRequest) {

    const newIdentifier = uuid().replace(/-/g, '');

    // Discard the Guid coming from outside because we should not trust it
    body.chainCode.identifier = newIdentifier;

    Logger.log('Will handle installation for chain-code ' + body.chainCode.identifier, 'Chain-code Web API end-point');

    const installResult = await new Network()
      .organization(body.msp.identifier)
      .manage(body.administrator)
      .installChainCode(body.chainCode);

    const packageResult = this.package(body.chainCode, installResult.peers);

    // Need to return the new chain-code identifier
    if (packageResult) {
      return {
        chainCode: {
          identifier: newIdentifier,
        },
      };
    }

    return {};
  }

  @Post('instantiate')
  async instantiate(@Body() body: ChainCodeInstantiateRequest) {

    Logger.log('Will handle instantiation for chain-code instance ' + body.chainCode.name, 'Chain-code Web API end-point');

    const result = await new Network()
      .organization(body.msp.identifier)
      .manage(body.administrator)
      .instantiateChainCode(body.chainCode);

    return result;
  }

  private package(chainCode: ChainCodeModel, peers: any[]): boolean {

    // Create an archive
    const output = fs.createWriteStream('./packages/' + chainCode.identifier + '.zip');
    const archive = archiver('zip');
    archive.pipe(output);

    // Add the chain-code binary to archive
    archive.glob(chainCode.name + '/' + chainCode.name, {
      cwd: './chaincodes/',
    });

    // Merge the shell template
    let shellTemplate = fs.readFileSync('./chaincodes/' + chainCode.name + '/' + 'start.tpl.sh').toString();
    shellTemplate = shellTemplate.replace(/{CHAINCODE_ID_NAME}/g, chainCode.identifier);
    shellTemplate = shellTemplate.replace(/{CHAINCODE_VERSION}/g, chainCode.version);
    const peer = peers[0];
    // We predict peer port accepting chain-code connections based on default settings
    // TODO: This port may change
    const peerChainCodeHost = peer._url.replace('grpc://', '').replace('7051', '7052');
    shellTemplate = shellTemplate.replace(/{PEER_ADDRESS}/g, peerChainCodeHost);

    // Add the shell file to archive
    archive.append(shellTemplate, {
      name: chainCode.name + '/' + 'start.sh',
    });

    archive.finalize();

    // Report success as we have reached the end
    return true;
  }
}
