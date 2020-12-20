import { findImplementation } from '@/index';
import * as cortalconsors from '../../src/brokers/cortalconsors';
import {
  allSamples,
  buySamples,
  sellSamples,
  dividendSamples,
} from './__mocks__/cortalconsors';

describe('Broker: Cortal Consors', () => {
  let consoleErrorSpy;

  describe('Check all documents', () => {
    test('Can one page parsed with cortal consors', () => {
      allSamples.forEach(samples => {
        expect(
          samples.some(item => cortalconsors.canParseFirstPage(item, 'pdf'))
        ).toEqual(true);
      });
    });

    test('Can identify a broker from one page as cortal consors', () => {
      allSamples.forEach(samples => {
        const implementations = findImplementation(samples, 'pdf');

        expect(implementations.length).toEqual(1);
        expect(implementations[0]).toEqual(cortalconsors);
      });
    });
  });

  describe('Buy', () => {
    test('Should map the document correctly: 2014_allianz', () => {
      const activities = cortalconsors.parsePages(buySamples[0]).activities;

      expect(activities).toEqual([
        {
          broker: 'cortalconsors',
          type: 'Buy',
          date: '2014-03-07',
          datetime: '2014-03-07T17:20:51.000Z',
          wkn: '840400',
          isin: 'DE0008404005',
          company: 'ALLIANZ SE VNA O.N.',
          shares: 23,
          price: 124.9,
          amount: 2872.7,
          fee: 6.9,
          tax: 0,
        },
      ]);
    });

    test('Should map the document correctly: 2014_ishares_etf_with_commission.json', () => {
      const activities = cortalconsors.parsePages(buySamples[1]).activities;

      expect(activities).toEqual([
        {
          broker: 'cortalconsors',
          type: 'Buy',
          date: '2014-02-17',
          datetime: '2014-02-17T07:02:48.000Z',
          wkn: '251124',
          isin: 'DE0002511243',
          company: 'ISHS-EO CO.BD LA.C.UTS DZ',
          shares: 0.38007,
          price: 129.60770384402872,
          amount: 49.26,
          fee: 0.74,
          tax: 0,
        },
      ]);
    });
  });

  describe('Sell', () => {
    test('Should map the document correctly: 2014_allianz', () => {
      const activities = cortalconsors.parsePages(sellSamples[0]).activities;

      expect(activities).toEqual([
        {
          broker: 'cortalconsors',
          type: 'Sell',
          date: '2014-12-05',
          datetime: '2014-12-05T20:04:14.000Z',
          wkn: '840400',
          isin: 'DE0008404005',
          company: 'ALLIANZ SE VNA O.N.',
          shares: 23,
          price: 138.15521739130435,
          amount: 3177.57,
          fee: 4.95,
          tax: 77.28,
        },
      ]);
    });
  });

  describe('Dividend', () => {
    test('Should map the document correctly: 2014_allianz', () => {
      const activities = cortalconsors.parsePages(dividendSamples[0])
        .activities;

      expect(activities).toEqual([
        {
          broker: 'cortalconsors',
          type: 'Dividend',
          date: '2014-05-08',
          datetime: '2014-05-08T' + activities[0].datetime.substring(11),
          wkn: '840400',
          company: 'Allianz SE',
          shares: 23,
          price: 5.3,
          amount: 121.9,
          fee: 0,
          tax: 32.15,
        },
      ]);
    });

    test('Should map the document correctly: 2014_etf_x-tracke', () => {
      const activities = cortalconsors.parsePages(dividendSamples[1])
        .activities;

      expect(activities).toEqual([
        {
          broker: 'cortalconsors',
          type: 'Dividend',
          date: '2014-07-31',
          datetime: '2014-07-31T' + activities[0].datetime.substring(11),
          wkn: 'DBX0NH',
          company: 'db x-tracke.DAX U.ETF(DR)-Inc.',
          shares: 7.45056,
          price: 3.469537860241378,
          amount: 25.85,
          fee: 0,
          tax: 0,
        },
      ]);
    });
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
});
