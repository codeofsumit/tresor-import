import format from 'date-fns/format';
import parse from 'date-fns/parse';
import every from 'lodash/every';
import values from 'lodash/values';
import Big from 'big.js';

import { parseGermanNum } from '@/helper';

export const isPageTypeBuy = content =>
  content.some(
    line =>
      line.includes('Wertpapier Abrechnung Kauf') ||
      line.includes('Wertpapier Abrechnung Ausgabe Investmentfonds')
  );

export const isPageTypeSell = content =>
  content.some(line => line.includes('Wertpapier Abrechnung Verkauf'));

export const isPageTypeDividend = content =>
  content.some(line => line.includes('Ausschüttung Investmentfonds'));

export const findISIN = content =>
  content[findLineNumberByContent(content, 'ISIN') + 5];

export const findOrderDate = content => {
  const value = content[findLineNumberByContent(content, 'Schlusstag') + 1];
  if (!value.includes(' ')) {
    return value;
  }

  return value.split(' ')[0];
};

export const findPayDate = content =>
  content[findLineNumberByContent(content, 'Zahlbarkeitstag') + 1];

export const findCompany = content =>
  content[findLineNumberByContent(content, 'Stück') + 1];

export const findShares = content =>
  parseGermanNum(
    content[findLineNumberByContent(content, 'Stück')].split(' ')[1]
  );

export const findAmount = (content, findTotalAmount) => {
  return formatNumber(
    content[
      findLineNumberByContent(
        content,
        findTotalAmount ? 'Ausmachender Betrag' : 'Kurswert'
      ) + 1
    ]
  );
};

export const findPayoutAmount = content => {
  let currentLineNumber = findLineNumberByContent(content, 'Ausschüttung');

  while (!content[currentLineNumber + 2].includes('EUR')) {
    currentLineNumber += 2;
  }

  return formatNumber(content[currentLineNumber + 1]);
};

export const formatNumber = value => {
  if (value.endsWith('-')) {
    value = value.slice(0, -1);
  }

  return parseGermanNum(value);
};

export const findLineNumberByContent = (content, term) =>
  content.findIndex(line => line.includes(term));

export const canParseData = content =>
  content.some(line => line.includes('1822direkt')) &&
  (isPageTypeBuy(content) ||
    isPageTypeSell(content) ||
    isPageTypeDividend(content));

export const parseData = content => {
  let type, date, isin, company, shares, price, amount, fee, tax;

  if (isPageTypeBuy(content)) {
    const amountWithoutFees = Big(findAmount(content, false));
    type = 'Buy';
    isin = findISIN(content);
    company = findCompany(content);
    date = findOrderDate(content);
    shares = findShares(content);
    amount = +amountWithoutFees;
    price = +amountWithoutFees.div(Big(shares));
    fee = +Big(findAmount(content, true)).minus(amountWithoutFees);
    tax = 0;
  } else if (isPageTypeSell(content)) {
    const amountWithoutFees = Big(findAmount(content, false));
    type = 'Sell';
    isin = findISIN(content);
    company = findCompany(content, false);
    date = findOrderDate(content);
    shares = findShares(content, false);
    amount = +amountWithoutFees;
    price = +amountWithoutFees.div(Big(shares));
    fee = +Big(amountWithoutFees).minus(findAmount(content, true));
    tax = 0;
  } else if (isPageTypeDividend(content)) {
    const amountWithoutTaxes = Big(findPayoutAmount(content));
    type = 'Dividend';
    isin = findISIN(content);
    company = findCompany(content, true);
    date = findPayDate(content);
    shares = findShares(content, true);
    amount = +amountWithoutTaxes;
    price = +amountWithoutTaxes.div(Big(shares));
    fee = 0;
    tax = +Big(amountWithoutTaxes).minus(findAmount(content, true));
  } else {
    console.error('Unknown page type for 1822direkt');
  }

  const activity = {
    broker: '1822direkt',
    type,
    date: format(parse(date, 'dd.MM.yyyy', new Date()), 'yyyy-MM-dd'),
    isin,
    company,
    shares,
    price,
    amount,
    fee,
    tax,
  };

  const valid = every(values(activity), a => !!a || a === 0);

  if (!valid) {
    console.error('The parsed pages is invalid for 1822direkt', activity);
    return undefined;
  } else {
    return activity;
  }
};

export const parsePages = contents => {
  let activities = [];

  for (let content of contents) {
    try {
      let activity = parseData(content);
      if (activity === undefined) {
        return;
      }

      activities.push(activity);
    } catch (exception) {
      console.error(
        'Error while parsing page (1822direkt)',
        exception,
        content
      );
    }
  }

  return activities;
};
