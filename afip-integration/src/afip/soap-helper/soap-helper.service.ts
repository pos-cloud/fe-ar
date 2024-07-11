import { Injectable } from '@nestjs/common';
import * as xml2js from 'xml2js';
@Injectable()
export class SoapHelperService {
  parser = xml2js.Parser();
  createClient(address) {
    let client = await soap.createClientAsync(address, {});
    return client;
  }
  callEndpoint(client, endpoint, data) {
    return new Promise(async (resolve, reject) => {
      client[endpoint](
        data,
        async function (err, res, rawResponse, soapHeader, rawRequest) {
          try {
            if (err) throw err;
            resolve(res);
          } catch (e) {
            reject(e);
          }
        },
      );
    });
  }
}
