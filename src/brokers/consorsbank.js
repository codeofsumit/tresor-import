import Big from 'big.js';
import {
  parseGermanNum,
  validateActivity,
  findFirstIsinIndexInArray,
  createActivityDateTime,
  timeRegex,
} from '@/helper';

const findISIN = textArr => {
  return textArr[findFirstIsinIndexInArray(textArr)];
};

const findWKN = textArr => {
  // for older dividend files
  const wknIndexOld = textArr.findIndex(line => line.includes('WKN: '));
  if (wknIndexOld >= 0) {
    return textArr[wknIndexOld].split(/\s+/)[3];
  }
  // for newer dividend files
  const wknStringIndex = textArr.findIndex(line => line === 'WKN');
  if (wknStringIndex >= 0) {
    const wknIndexOffset = findFirstIsinIndexInArray(
      textArr.slice(wknStringIndex)
    );
    return textArr[wknStringIndex + wknIndexOffset - 1];
  }
  return undefined;
};

const findCompany = textArr => {
  let indexIsinWkn = textArr.findIndex(line => line === 'ISIN');
  // For older documents there is only a wkn
  if (indexIsinWkn < 0) {
    indexIsinWkn = textArr.findIndex(line => line.includes('WKN: '));
  }
  const name_index_one = textArr[indexIsinWkn + 1];
  // Sometimes a company name is split in two during JSONifying. Only
  // happens in newer documents that have an isin
  if (findFirstIsinIndexInArray(textArr.slice(indexIsinWkn)) > 3) {
    return name_index_one.concat(' ', textArr[indexIsinWkn + 2]);
  }
  return name_index_one;
};

const findBuySellLineNumber = content => {
  return content.findIndex(
    line =>
      line.toLowerCase() === 'orderabrechnung' ||
      line.toLowerCase() === 'wertpapierabrechnung'
  );
};

const findDateBuySell = content => {
  // Before 12/2015 the headline is 'Wertpapierabrechnung'
  const lineNumber = findBuySellLineNumber(content);
  if (lineNumber <= 0) {
    return undefined;
  }

  let offset = 0;
  let substrFrom = 3;
  if (content[lineNumber + 2].toLowerCase() === 'am') {
    offset = 1;
    substrFrom = 0;
  }

  return content[lineNumber + 2 + offset].substr(substrFrom).trim();
};

const findOrderTime = content => {
  // Extract the time after the line with order time which contains "15:57:49"
  const lineNumber = findBuySellLineNumber(content);
  if (lineNumber <= 0) {
    return undefined;
  }

  const offset = content[lineNumber + 2].toLowerCase() !== 'am' ? 0 : 1;
  const lineContent = content[lineNumber + 4 + offset];
  if (lineContent === undefined || !timeRegex(true).test(lineContent)) {
    return undefined;
  }

  return lineContent.trim();
};

const findDateDividend = textArr => {
  const keyword = 'valuta';
  const dateLine = textArr.find(t => t.toLowerCase().includes(keyword));
  if (dateLine !== undefined) {
    return dateLine.substr(keyword.length).trim();
  }

  const keywordOld = 'EX-TAG';
  const dateLineOld = textArr.find(t => t.includes(keywordOld));
  if (dateLineOld !== undefined) {
    return dateLineOld.substr(keywordOld.length).trim();
  }
};

const findShares = textArr => {
  const idx = textArr.findIndex(t => t.toLowerCase() === 'umsatz');
  const shares = textArr[idx + 2];

  return parseGermanNum(shares);
};

const findDividendShares = textArr => {
  const idx = textArr.findIndex(line => line.toLowerCase() === 'bestand');
  // For newer files:
  if (idx >= 0) {
    return parseGermanNum(textArr[idx + 1].split(' ')[0]);
  }
  // For older files:
  else {
    const idxOld = textArr.findIndex(line => line === 'DIVIDENDENGUTSCHRIFT');
    if (idxOld >= 0) {
      return parseGermanNum(textArr[idxOld + 1].split(/\s+/)[1]);
    }
  }
};

const findAmount = (textArr, type) => {
  if (type === 'Buy' || type === 'Sell') {
    let lineNumber = textArr.indexOf('Kurswert');
    if (lineNumber <= 0) {
      lineNumber = textArr.indexOf('Nettoinventarwert');
    }

    let offset = 0;
    if (textArr[lineNumber + 1] === '') {
      // Documents before 12/2015 have an empty line after 'Kurswert'
      offset += 1;
    }

    if (/^[A-Z]{3}$/.test(textArr[lineNumber + 1 + offset])) {
      // Documents before dec 2020 have the currency in a line before the amount.
      offset += 1;
    }

    return parseGermanNum(textArr[lineNumber + 1 + offset]);
  }

  if (type === 'Dividend') {
    let amount, idx;

    const oldDividendFile = textArr.some(
      line => line.includes('IBAN') && line !== 'IBAN'
    );

    if (!oldDividendFile) {
      // "Brutto in EUR" is only present if the dividend is paid in a foreign currency, otherwise its just "Brutto"
      idx = textArr.indexOf('Brutto in EUR');
      if (idx < 0) {
        idx = textArr.indexOf('Brutto');
      }
      if (idx >= 0) {
        amount = textArr[idx + 1].split(' ')[0];
      }
    } else {
      idx = textArr.findIndex(line => line.includes('BRUTTO'));
      if (idx >= 0) {
        amount = textArr[idx].split(/\s+/)[2];
      }
    }

    return parseGermanNum(amount);
  }
};

const getNumberAfterTermWithOffset = (content, termToLower, offset = 0) => {
  const lineNumber = content.findIndex(line =>
    line.toLowerCase().includes(termToLower)
  );

  if (lineNumber <= 0) {
    return 0;
  }

  if (/^[A-Z]{3}$/.test(content[lineNumber + offset + 1])) {
    // Documents before dec 2020 have the price after the currency line.
    return parseGermanNum(content[lineNumber + offset + 2]);
  }

  return parseGermanNum(content[lineNumber + offset + 1]);
};

const findFee = content => {
  const feeBrokerage = getNumberAfterTermWithOffset(content, 'provision');
  const feeBase = getNumberAfterTermWithOffset(content, 'grundgebühr');
  let feeIssue = 0;
  if (!content.indexOf('Ausgabegebühr 0,00%')) {
    feeIssue = getNumberAfterTermWithOffset(content, 'ausgabegebühr');
  }

  return Math.abs(+Big(feeBrokerage).plus(Big(feeBase)).plus(Big(feeIssue)));
};

const findTax = textArr => {
  const kapstIdx = textArr.findIndex(t => t.toLowerCase() === 'kapst');
  const solzIdx = textArr.findIndex(t => t.toLowerCase() === 'solz');

  const kapst = kapstIdx >= 0 ? textArr[kapstIdx + 3] : null;
  const solz = solzIdx >= 0 ? textArr[solzIdx + 3] : null;
  const sum = +Big(parseGermanNum(kapst)).plus(Big(parseGermanNum(solz)));

  return Math.abs(sum);
};

const findDividendTax = (textArr, amount) => {
  // For older dividend files:
  const netAmountIndex = textArr.findIndex(line => line.includes('WERT'));
  if (netAmountIndex >= 0) {
    const netAmount = parseGermanNum(textArr[netAmountIndex].split(/\s+/)[3]);
    return +Big(amount).minus(netAmount);
  }

  // For newer dividend files
  const netAmountIndexNew = textArr.findIndex(
    line => line === 'Netto zugunsten' || line === 'Netto zulasten'
  );
  if (netAmountIndexNew >= 0) {
    const netAmount = parseGermanNum(
      textArr[netAmountIndexNew + 4].split(/\s+/)[0]
    );
    return +Big(amount).minus(netAmount);
  }
};

const findForeignInformation = textArr => {
  const foreignInfo = textArr.findIndex(line => line.includes('Devisenkurs'));
  if (foreignInfo >= 0) {
    const foreignInfoLine = textArr[foreignInfo + 1].split(/\s+/);
    return [parseGermanNum(foreignInfoLine[0]), foreignInfoLine[1]];
  }
  return [undefined, undefined];
};

const isBuy = textArr => {
  // Before 12/2015 the headline is 'Wertpapierabrechnung'
  const lineNumber = findBuySellLineNumber(textArr);
  return lineNumber >= 0 && textArr[lineNumber + 1].toLowerCase() === 'kauf';
};

const isSell = textArr => {
  // Before 12/2015 the headline is 'Wertpapierabrechnung'
  const lineNumber = findBuySellLineNumber(textArr);
  return lineNumber >= 0 && textArr[lineNumber + 1].toLowerCase() === 'verkauf';
};

const isDividend = textArr =>
  textArr.some(t =>
    ['ertragsgutschrift', 'dividendengutschrift'].includes(t.toLowerCase())
  );

export const canParsePage = (content, extension) => {
  if (extension !== 'pdf') {
    return false;
  }

  const isConsors = content.some(
    line => line.toLowerCase && line.toLowerCase().includes('consorsbank')
  );

  if (!isConsors) {
    return false;
  }

  return isBuy(content) || isSell(content) || isDividend(content);
};

const parseData = textArr => {
  let type, date, time, shares, amount, fee, tax, fxRate, foreignCurrency;

  const isin = findISIN(textArr);
  const company = findCompany(textArr);
  const wkn = findWKN(textArr);

  if (isBuy(textArr)) {
    type = 'Buy';
    date = findDateBuySell(textArr);
    time = findOrderTime(textArr);
    shares = findShares(textArr);
    amount = findAmount(textArr, 'Buy');
    fee = findFee(textArr);
    tax = 0;
  } else if (isSell(textArr)) {
    type = 'Sell';
    date = findDateBuySell(textArr);
    time = findOrderTime(textArr);
    shares = findShares(textArr);
    amount = findAmount(textArr, 'Sell');
    fee = findFee(textArr);
    tax = findTax(textArr);
  } else if (isDividend(textArr)) {
    type = 'Dividend';
    date = findDateDividend(textArr);
    shares = findDividendShares(textArr);
    amount = findAmount(textArr, 'Dividend');
    fee = 0;
    tax = findDividendTax(textArr, amount);
    [fxRate, foreignCurrency] = findForeignInformation(textArr);
  }

  const [parsedDate, parsedDateTime] = createActivityDateTime(
    date,
    time,
    'dd.MM.yyyy',
    'dd.MM.yyyy HH:mm:ss'
  );

  const activity = {
    broker: 'consorsbank',
    type,
    date: parsedDate,
    datetime: parsedDateTime,
    company,
    shares,
    price: +Big(amount).div(Big(shares)),
    amount,
    fee,
    tax,
  };

  if (wkn !== undefined) {
    activity.wkn = wkn;
  }
  if (isin !== undefined) {
    activity.isin = isin;
  }
  if (fxRate !== undefined) {
    activity.fxRate = fxRate;
  }
  if (foreignCurrency !== undefined) {
    activity.foreignCurrency = foreignCurrency;
  }

  return validateActivity(activity);
};

export const parsePages = contents => {
  const activities = [parseData(contents[0])];

  return {
    activities,
    status: 0,
  };
};
