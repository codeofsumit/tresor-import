import format from 'date-fns/format';
import parse from 'date-fns/parse';
import Big from 'big.js';

import { parseGermanNum, validateActivity } from '@/helper';

const findISIN = (text, span) => {
  const isinLine = text[text.findIndex(t => t.includes('/ISIN')) + span];
  return isinLine.substr(isinLine.length - 12);
};

const findCompany = (text, span) => {
  const companyLine = text[text.findIndex(t => t.includes('/ISIN')) + span];
  // span = 2 means its a dividend PDF - dividends dont have the WKN in the same line
  return span === 2
    ? companyLine.trim()
    : companyLine.substr(0, companyLine.length - 6).trim();
};

const findDateBuySell = textArr => {
  const dateLine = textArr[textArr.findIndex(t => t.includes('Valuta')) + 1];
  const date = dateLine.split(/\s+/);
  return date[date.length - 3];
};

const findDateDividend = textArr => {
  const dateLine = textArr[textArr.findIndex(t => t.includes('zahlbar ab'))];
  return dateLine.split('zahlbar ab')[1].trim().substr(0, 10);
};

const findShares = textArr => {
  const sharesLine =
    textArr[textArr.findIndex(t => t.includes('Nennwert')) + 1];

  let shares = 0;
  let hasPiece = false;
  sharesLine.split(' ').forEach(element => {
    if (shares > 0) {
      return;
    }

    if (element.includes('St.')) {
      hasPiece = true;
      return;
    }

    if (!hasPiece || element.length == 0) {
      return;
    }

    shares = parseGermanNum(element);
  });

  return shares;
};

const findDividendShares = textArr => {
  const sharesLine = textArr[textArr.findIndex(t => t.includes('STK'))];
  const shares = sharesLine.split('  ').filter(i => i.length > 0)[1];
  return parseGermanNum(shares);
};

const findAmount = textArr => {
  const priceArea = textArr.slice(
    textArr.findIndex(t => t.includes('Kurswert'))
  );
  const priceLine = priceArea[priceArea.findIndex(t => t.includes('EUR'))];
  const amount = priceLine.split('EUR')[1].trim();
  return parseGermanNum(amount);
};

const findPayout = textArr => {
  const amountLine = textArr[textArr.findIndex(t => t.includes('Gunsten')) + 1];
  const amountPart = amountLine.split('EUR');
  const amount = amountPart[amountPart.length - 1].trim();
  return parseGermanNum(amount);
};

const findFee = textArr => {
  const amount = findAmount(textArr);
  const totalCostLine =
    textArr[textArr.findIndex(t => t.includes('Zu Ihren')) + 1];
  const totalCost = totalCostLine.split('EUR').pop().trim();

  const diff = +Big(parseGermanNum(totalCost)).minus(Big(amount));
  return Math.abs(diff);
};

const findPurchaseReduction = textArr => {
  const reduction = Big(0);
  const lineWithReduction = textArr.findIndex(t =>
    t.includes('Reduktion Kaufaufschlag')
  );
  if (lineWithReduction < 0) {
    return +reduction;
  }
  let rate = 1;

  if (!textArr[lineWithReduction].includes('EUR')) {
    rate = parseGermanNum(textArr[lineWithReduction - 1].split(' ')[3]);
  }
  const reductionValueSplit = textArr[lineWithReduction].split(' ');
  let reductionValue = reductionValueSplit[reductionValueSplit.length - 1];
  if (reductionValue.endsWith('-')) {
    reductionValue = Big(parseGermanNum(reductionValue.slice(0, -1))).abs();
  }
  return +Big(reductionValue).div(rate);
};

const isBuy = textArr => textArr.some(t => t.includes('Wertpapierkauf'));
const isSell = textArr => textArr.some(t => t.includes('Wertpapierverkauf'));

const isDividend = textArr =>
  textArr.some(t => t.includes('Ertragsgutschrift')) ||
  textArr.some(t => t.includes('Dividendengutschrift'));

export const canParsePage = (content, extension) =>
  extension === 'pdf' &&
  content.some(line => line.includes('comdirect bank')) &&
  (isBuy(content) || isSell(content) || isDividend(content));

const parseData = textArr => {
  let type, date, isin, company, shares, price, amount, fee, tax;

  if (isBuy(textArr)) {
    const reduction = findPurchaseReduction(textArr);
    const foundAmount = Big(findAmount(textArr));
    const totalAmount = foundAmount.plus(reduction);
    const totalFee = Big(findFee(textArr)).minus(reduction); // Use plus instead of minus to prevent multiply with -1

    type = 'Buy';
    isin = findISIN(textArr, 2);
    company = findCompany(textArr, 1);
    date = findDateBuySell(textArr);
    shares = findShares(textArr);
    amount = +totalAmount;
    price = 0;
    price = +foundAmount.div(Big(shares));
    fee = +totalFee;
    tax = 0;
  } else if (isSell(textArr)) {
    type = 'Sell';
    isin = findISIN(textArr, 2);
    company = findCompany(textArr, 1);
    date = findDateBuySell(textArr);
    shares = findShares(textArr);
    amount = findAmount(textArr);
    price = +Big(amount).div(Big(shares));
    fee = findFee(textArr);
    tax = 0;
  } else if (isDividend(textArr)) {
    type = 'Dividend';
    isin = findISIN(textArr, 3);
    company = findCompany(textArr, 2);
    date = findDateDividend(textArr);
    shares = findDividendShares(textArr);
    amount = findPayout(textArr);
    price = +Big(amount).div(Big(shares));
    fee = 0;
    tax = 0;
  }

  return validateActivity({
    broker: 'comdirect',
    type,
    date: format(parse(date, 'dd.MM.yyyy', new Date()), 'yyyy-MM-dd'),
    isin,
    company,
    shares,
    price,
    amount,
    fee,
    tax,
  });
};

export const parsePages = contents => {
  const activities = [parseData(contents[0])];

  return {
    activities,
    status: 0,
  };
};
