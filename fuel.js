import { DOMParser } from '@xmldom/xmldom';
import { argv } from 'node:process';
import 'dotenv/config';

async function fetchRSSFeed(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rssText = await response.text();

        return rssText;

    } catch (error) {
        throw error('Error fetching RSS feed:', { cause: error });
    }
}

function parseRSS(rssText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssText, 'text/xml');
    return xmlDoc;
}

function extractFeedItems(xmlDoc) {
    const items = xmlDoc.getElementsByTagName('item');
    const feedItems = [];

    for (let i = 0; i < items.length; i++) {
        const name = items[i].getElementsByTagName('trading-name')[0].textContent;
        const price = items[i].getElementsByTagName('price')[0]?.textContent;
        feedItems.push({ name, price });
    }

    return feedItems;
}

let suburb = 'Bayswater';
let brandId;
let brandOption;

if (argv[2]) {
    suburb = argv[2];
}

if (argv[3]) {
    brandId = argv[3];
}

// Defaults to Caltex
if (brandId === "all") {
    brandOption = "";
} else if (brandId) {
    brandOption = `&Brand=${brandId}`;
} else {
    brandId = "Caltex";
    brandOption = '&Brand=6';
}

const apiBaseUrl = process.env.API_BASE_URL;

if (!apiBaseUrl) {
    throw new Error("Error: API_BASE_URL environment variable is not set.");
}

const rssUrlToday = `${apiBaseUrl}?product=1&suburb=${suburb}&Day=today${brandOption}`;
const rssUrlTomorrow = `${apiBaseUrl}?product=1&suburb=${suburb}&Day=tomorrow${brandOption}`;

const today = await fetchRSSFeed(rssUrlToday).then((rssText) => {
    const xmlDoc = parseRSS(rssText);
    const feedItems = extractFeedItems(xmlDoc);
    return feedItems;
});

const tomorrow = await fetchRSSFeed(rssUrlTomorrow).then((rssText) => {
    const xmlDoc = parseRSS(rssText);
    const feedItems = extractFeedItems(xmlDoc);
    return feedItems;
});

const tomorrowMap = new Map(tomorrow.map(station => [station.name, station.price]));
const combinedArray = today.map(({ name, price }) => ({
  name,
  priceToday: price,
  priceTomorrow: tomorrowMap.get(name) ?? null
}));

console.log("Suburb:", suburb);
console.log("Brand:", brandId);
console.log(combinedArray);
