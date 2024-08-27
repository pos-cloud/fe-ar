import { Injectable } from '@nestjs/common';
import * as soap from 'soap';
import * as xml2js from 'xml2js';
@Injectable()
export class SoapHelperService {
  parser = xml2js.Parser();
  async createClient(address, endpoint) {
    const client = await soap.createClientAsync(address, {
      endpoint,
      envelopeKey: 'wsaa',
    });
    return client;
  }
  private groupChildren(obj) {
    for (const prop in obj) {
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
    const builder = new xml2js.Builder();
    const parsedJson = this.groupChildren(json);
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
    return new Promise(async (resolve, reject) => {
      client[endpoint](data, async (err, res) => {
        try {
          if (err) throw err;
          resolve(res);
        } catch (e) {
          console.log(e);
          reject(e);
        }
      });
    });
  }
}
