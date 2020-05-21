import { getBroker } from '../../src/';
import * as ing from '../../src/brokers/ing';
import {
  buySamples,
  sellSamples,
  dividendsSamples,
  invalidSamples,
} from './__mocks__/ing';

console.error = jest.fn();

describe('Test Ing', () => {
  test('Should identify ing as broker', () => {
    for (let sample of buySamples.concat(sellSamples, dividendsSamples)) {
      expect(getBroker(sample)).toEqual(ing);
    }
  });

  test('Should not identify ing as broker if ing BIC is not present', () => {
    try {
      getBroker(invalidSamples[0]);
    } catch (e) {
      expect(e).toEqual('No supported broker found!');
    }
  });

  describe('Buy', () => {
    test('Test if buy1 is mapped correctly', () => {
      const activity = ing.parseData(buySamples[0]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Buy',
        date: '2020-03-03',
        isin: 'US5949181045',
        company: 'Microsoft Corp.',
        shares: 10,
        price: 151.72,
        amount: 1517.2,
        fee: 8.69,
      });
    });

    test('Test if buy2 is mapped correctly', () => {
      const activity = ing.parseData(buySamples[1]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Buy',
        date: '2017-01-10',
        isin: 'US0846707026',
        company: 'Berkshire Hathaway Inc.',
        shares: 5,
        price: 153.48,
        amount: 767.4,
        fee: 9.9,
      });
    });

    test('Test if investment plan is mapped correctly', () => {
      const activity = ing.parseData(buySamples[2]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Buy',
        date: '2019-04-15',
        isin: 'LU0274208692',
        company: 'Xtrackers MSCI World Swap',
        shares: 4.51124,
        price: 54.464,
        amount: 245.7,
        fee: 4.3,
      });
    });
  });

  describe('Sell', () => {
    test('Test if sell1 is mapped correctly', () => {
      const activity = ing.parseData(sellSamples[0]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Sell',
        date: '2020-01-14',
        isin: 'FR0010790980',
        company: 'Amundi ETF STOXX Europe 50',
        shares: 8,
        price: 79.71,
        amount: 637.68,
        fee: 6.49,
      });
    });

    test('Test if sell2 is mapped correctly', () => {
      const activity = ing.parseData(sellSamples[1]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Sell',
        date: '2019-03-06',
        isin: 'US0079031078',
        company: 'Advanced Micro Devices Inc.',
        shares: 20,
        price: 20.09,
        amount: 401.8,
        fee: 5.9,
      });
    });
  });

  describe('Dividend', () => {
    test('Test if dividend1 is mapped correctly', () => {
      const activity = ing.parseData(dividendsSamples[0]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Dividend',
        date: '2020-03-12',
        isin: 'US5949181045',
        company: 'Microsoft Corp.',
        shares: 32,
        price: 0.385625,
        amount: 12.34,
        fee: 0,
      });
    });

    test('Test if dividend2 is mapped correctly', () => {
      const activity = ing.parseData(dividendsSamples[1]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Dividend',
        date: '2020-03-18',
        isin: 'NL0000388619',
        company: 'Unilever N.V.',
        shares: 8,
        price: 0.34875,
        amount: 2.79,
        fee: 0,
      });
    });

    test('Test if dividend3 is mapped correctly', () => {
      const activity = ing.parseData(dividendsSamples[2]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Dividend',
        date: '2020-05-04',
        isin: 'IE00BZ163G84',
        company: 'Vanguard EUR Corp.Bond U.ETF',
        shares: 29,
        price: 0.02,
        amount: 0.58,
        fee: 0,
      });
    });

    test('Test if dividend4 is mapped correctly', () => {
      const activity = ing.parseData(dividendsSamples[3]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Dividend',
        date: '2020-04-15',
        isin: 'DE000A0F5UH1',
        company: 'iSh.ST.Gl.Sel.Div.100 U.ETF DE',
        shares: 34,
        price: 0.17705882352941177,
        amount: 6.02,
        fee: 0,
      });
    });

    test('Test if dividend5 is mapped correctly', () => {
      const activity = ing.parseData(dividendsSamples[4]);

      expect(activity).toEqual({
        broker: 'ing',
        type: 'Dividend',
        date: '2020-04-08',
        isin: 'IE00B3RBWM25',
        company: 'Vanguard FTSE All-World U.ETF',
        shares: 270,
        price: 0.30596296296296294,
        amount: 82.61,
        fee: 0,
      });
    });
  });
});
