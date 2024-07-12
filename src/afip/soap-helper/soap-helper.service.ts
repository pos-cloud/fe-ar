import { Injectable } from '@nestjs/common';
import * as xml2js from 'xml2js';
import * as soap from 'soap';
@Injectable()
export class SoapHelperService {
  parser = xml2js.Parser();
  async createClient(address, endpoint) {
    let client = await soap.createClientAsync(address, { endpoint, envelopeKey: 'ns1' });
    return client;
  }
  private groupChildren(obj) {
    for (let prop in obj) {
      if (typeof obj[prop] === 'object') {
        this.groupChildren(obj[prop]);
      } else {
        obj['$'] = obj['$'] || {};
        obj['$'][prop] = obj[prop];
        delete obj[prop];
      }
    }

    return obj;
  }
  json2xml(json: Object): Object {
    var builder = new xml2js.Builder();
    let parsedJson = this.groupChildren(json);
    return builder.buildObject(parsedJson);
  }
  xml2Array(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      xml2js.parseString(xml, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
  async callEndpoint(client, endpoint, data) {
    console.log(data);
    return new Promise(async (resolve, reject) => {
      client[endpoint](
        data,
        async function (err, res, rawResponse, soapHeader, rawRequest) {
          try {
            console.log(rawRequest);
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
