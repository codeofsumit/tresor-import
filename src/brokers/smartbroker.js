import { Big } from 'big.js';
import { parseGermanNum, validateActivity } from '@/helper';
import * as onvista from './onvista';

export const smartbrokerIdentificationString = 'Landsberger Straße 300';

const findTax = textArr => {
  let completeTax = Big(0);
  const capitalTaxIndex = textArr.findIndex(t =>
    t.includes('Kapitalertragsteuer')
  );
  if (capitalTaxIndex > 0) {
    completeTax = completeTax.plus(
      parseGermanNum(textArr[capitalTaxIndex + 2])
    );
  }
  const solidarityTaxIndex = textArr.findIndex(t =>
    t.includes('Solidaritätszuschlag')
  );
  if (solidarityTaxIndex > 0) {
    completeTax = completeTax.plus(
      parseGermanNum(textArr[solidarityTaxIndex + 2])
    );
  }
  const churchTaxIndex = textArr.findIndex(t => t.includes('Kirchensteuer'));
  if (solidarityTaxIndex > 0) {
    completeTax = completeTax.plus(parseGermanNum(textArr[churchTaxIndex + 2]));
  }
  const witholdingTaxIndex = textArr.findIndex(t =>
    t.includes('-Quellensteuer')
  );
  if (witholdingTaxIndex > 0) {
    completeTax = completeTax.plus(
      parseGermanNum(textArr[witholdingTaxIndex + 5])
    );
  }
  return +completeTax;
};

const findPayout = textArr => {
  let payoutIndex = textArr.indexOf('Steuerpflichtiger Ausschüttungsbetrag');
  if (payoutIndex < 0) {
    payoutIndex = textArr.indexOf('ausländische Dividende');
  }
  return parseGermanNum(textArr[payoutIndex + 2]);
};

export const canParsePage = (content, extension) =>
  extension === 'pdf' &&
  content.some(line => line.includes(smartbrokerIdentificationString)) &&
  (onvista.isBuy(content) ||
    onvista.isSell(content) ||
    onvista.isDividend(content));

const parseData = textArr => {
  let activity;
  const broker = 'smartbroker';
  const shares = onvista.findShares(textArr);
  const isin = onvista.findISIN(textArr);
  const company = onvista.findCompany(textArr);
  let type, amount, date, price;
  let tax = 0;
  let fee = 0;

  if (onvista.isBuy(textArr)) {
    type = 'Buy';
    amount = onvista.findAmount(textArr);
    date = onvista.findDateBuySell(textArr);
    price = onvista.findPrice(textArr);
    fee = onvista.findFee(textArr);
  } else if (onvista.isSell(textArr)) {
    type = 'Sell';
    amount = onvista.findAmount(textArr);
    date = onvista.findDateBuySell(textArr);
    price = onvista.findPrice(textArr);
    tax = findTax(textArr);
  } else if (onvista.isDividend(textArr)) {
    type = 'Dividend';
    amount = findPayout(textArr);
    date = onvista.findDateDividend(textArr);
    price = +Big(amount).div(shares);
    tax = findTax(textArr);
  }

  activity = {
    broker: broker,
    type: type,
    shares: shares,
    date: date,
    isin: isin,
    company: company,
    price: price,
    amount: amount,
    tax: tax,
    fee: fee,
  };
  return validateActivity(activity);
};

export const parsePages = contents => {
  // parse first page has activity data
  const activities = [parseData(contents[0])];

  return {
    activities,
    status: 0,
  };
};
