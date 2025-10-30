'use server';
import axios from 'axios';

// Define the structure of a client configuration object
interface ClientConfig {
  name: string;
  vtex_account_name: string;
  vtex_app_key: string;
  vtex_app_token: string;
  sheet_id: string;
  sheet_name: string;
}

// Helper function to safely access nested properties
const get = (obj: any, path: string, defaultValue: any = null) => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
};

// Flattens a VTEX order into a single row. No changes needed here.
function flattenVtexOrder(order: any): Record<string, any> {
  const now = new Date();
  const extractionDate = now.toISOString().split('T')[0];
  const firstItem = get(order, 'items.0', {});
  const firstLogisticsInfo = get(order, 'shippingData.logisticsInfo.0', {});
  const firstDeliveryId = get(firstLogisticsInfo, 'deliveryIds.0', {});
  const firstTransaction = get(order, 'paymentData.transactions.0', {});
  const firstPayment = get(firstTransaction, 'payments.0', {});
  const firstPriceTag = get(firstItem, 'priceTags.0', {});
  const firstCategory = get(firstItem, 'additionalInfo.categories.0', {});
  const firstTotal = get(order, 'totals.0', {});
  const firstRateAndBenefit = get(order, 'ratesAndBenefitsData.rateAndBenefits.0', {});
  const firstGiftCard = get(firstTransaction, 'giftCards.0', {});

  return {
    extractionDate,
    orderId: get(order, 'orderId'),
    sellerOrderId: get(order, 'sellerOrderId'),
    origin: get(order, 'origin'),
    affiliateId: get(order, 'affiliateId'),
    salesChannel: get(order, 'salesChannel'),
    merchantName: get(order, 'merchantName'),
    status: get(order, 'status'),
    statusDescription: get(order, 'statusDescription'),
    value: get(order, 'value'),
    creationDate: get(order, 'creationDate'),
    lastChange: get(order, 'lastChange'),
    orderGroup: get(order, 'orderGroup'),
    clientId: get(order, 'clientProfileData.userProfileId'),
    'shippingData.addressCity': get(order, 'shippingData.address.city'),
    'shippingData.addressState': get(order, 'shippingData.address.state'),
    'shippingData.addressCountry': get(order, 'shippingData.address.countryCode'),
    'shippingData.logisticsInfo.itemIndex': get(firstLogisticsInfo, 'itemIndex'),
    'shippingData.logisticsInfo.selectedSla': get(firstLogisticsInfo, 'selectedSla'),
    'shippingData.logisticsInfo.lockTTL': get(firstLogisticsInfo, 'lockTTL'),
    'shippingData.logisticsInfo.price': get(firstLogisticsInfo, 'price'),
    'shippingData.logisticsInfo.listPrice': get(firstLogisticsInfo, 'listPrice'),
    'shippingData.logisticsInfo.sellingPrice': get(firstLogisticsInfo, 'sellingPrice'),
    'shippingData.logisticsInfo.deliveryCompany': get(firstLogisticsInfo, 'deliveryCompany'),
    'shippingData.logisticsInfo.shippingEstimate': get(firstLogisticsInfo, 'shippingEstimate'),
    'shippingData.logisticsInfo.deliveryChannel': get(firstLogisticsInfo, 'deliveryChannel'),
    'shippingData.logisticsInfo.deliveryIds.courierId': get(firstDeliveryId, 'courierId'),
    'shippingData.logisticsInfo.deliveryIds.courierName': get(firstDeliveryId, 'courierName'),
    'shippingData.logisticsInfo.deliveryIds.dockId': get(firstDeliveryId, 'dockId'),
    'shippingData.logisticsInfo.deliveryIds.quantity': get(firstDeliveryId, 'quantity'),
    'shippingData.logisticsInfo.deliveryIds.warehouseId': get(firstDeliveryId, 'warehouseId'),
    'shippingData.logisticsInfo.deliveryIds.accountCarrierName': get(firstDeliveryId, 'accountCarrierName'),
    'paymentData.giftCards.value': get(firstGiftCard, 'value'),
    'paymentData.giftCards.balance': get(firstGiftCard, 'balance'),
    'paymentData.giftCards.provider': get(firstGiftCard, 'provider'),
    'paymentData.transactions.isActive': get(firstTransaction, 'isActive'),
    'paymentData.transactions.merchantName': get(firstTransaction, 'merchantName'),
    'paymentData.transactions.payments.paymentSystem': get(firstPayment, 'paymentSystem'),
    'paymentData.transactions.payments.paymentSystemName': get(firstPayment, 'paymentSystemName'),
    'paymentData.transactions.payments.value': get(firstPayment, 'value'),
    'paymentData.transactions.payments.installments': get(firstPayment, 'installments'),
    'paymentData.transactions.payments.referenceValue': get(firstPayment, 'referenceValue'),
    'paymentData.transactions.payments.group': get(firstPayment, 'group'),
    authorizedDate: get(order, 'authorizedDate'),
    invoicedDate: get(order, 'invoicedDate'),
    cancelReason: get(order, 'cancellationData.reason'),
    subscriptionData: get(order, 'subscriptionData') ? JSON.stringify(get(order, 'subscriptionData')) : null,
    taxData: get(order, 'taxData') ? JSON.stringify(get(order, 'taxData')) : null,
    checkedInPickupPointId: get(order, 'checkedInPickupPointId'),
    cancellationData: get(order, 'cancellationData') ? JSON.stringify(get(order, 'cancellationData')) : null,
    'totals.id': get(firstTotal, 'id'),
    'totals.name': get(firstTotal, 'name'),
    'totals.value': get(firstTotal, 'value'),
    'items.productId': get(firstItem, 'productId'),
    'items.quantity': get(firstItem, 'quantity'),
    'items.seller': get(firstItem, 'seller'),
    'items.name': get(firstItem, 'name'),
    'items.price': get(firstItem, 'price'),
    'items.listPrice': get(firstItem, 'listPrice'),
    'items.manualPrice': get(firstItem, 'manualPrice'),
    'items.priceTags.name': get(firstPriceTag, 'name'),
    'items.priceTags.value': get(firstPriceTag, 'value'),
    'items.priceTags.isPercentual': get(firstPriceTag, 'isPercentual'),
    'items.priceTags.rawValue': get(firstPriceTag, 'rawValue'),
    'items.priceTags.rate': get(firstPriceTag, 'rate'),
    'items.imageUrl': get(firstItem, 'imageUrl'),
    'items.detailUrl': get(firstItem, 'detailUrl'),
    'items.sellerSku': get(firstItem, 'sellerSku'),
    'items.priceValidUntil': get(firstItem, 'priceValidUntil'),
    'items.commission': get(firstItem, 'commission'),
    'items.tax': get(firstItem, 'tax'),
    'items.preSaleDate': get(firstItem, 'preSaleDate'),
    'items.additionalInfo.brandName': get(firstItem, 'additionalInfo.brandName'),
    'items.additionalInfo.brandId': get(firstItem, 'additionalInfo.brandId'),
    'items.additionalInfo.categoriesIds': get(firstItem, 'additionalInfo.categoriesIds'),
    'items.additionalInfo.categories.id': get(firstCategory, 'id'),
    'items.additionalInfo.categories.name': get(firstCategory, 'name'),
    'items.measurementUnit': get(firstItem, 'measurementUnit'),
    'items.unitMultiplier': get(firstItem, 'unitMultiplier'),
    'items.sellingPrice': get(firstItem, 'sellingPrice'),
    'items.isGift': get(firstItem, 'isGift'),
    'items.shippingPrice': get(firstItem, 'shippingPrice'),
    'items.rewardValue': get(firstItem, 'rewardValue'),
    'items.freightCommission': get(firstItem, 'freightCommission'),
    'items.taxCode': get(firstItem, 'taxCode'),
    'items.costPrice': get(firstItem, 'costPrice'),
    'ratesAndBenefitsData.description': get(firstRateAndBenefit, 'description'),
    'ratesAndBenefitsData.featured': get(firstRateAndBenefit, 'featured'),
    'ratesAndBenefitsData.id': get(firstRateAndBenefit, 'id'),
    'ratesAndBenefitsData.name': get(firstRateAndBenefit, 'name'),
    'ratesAndBenefitsData.couponCode': get(firstRateAndBenefit, 'couponCode'),
    'ratesAndBenefitsData.additionalInfo': get(firstRateAndBenefit, 'additionalInfo'),
    marketplaceServicesEndpoint: get(order, 'marketplaceServicesEndpoint'),
    utmSource: get(order, 'marketingData.utmSource'),
    utmCampaign: get(order, 'marketingData.utmCampaign'),
    utmMedium: get(order, 'marketingData.utmMedium'),
  };
}

// Creates API headers from a client's credentials
const getVtexApiHeaders = (appKey: string, appToken: string) => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-VTEX-API-AppKey': appKey,
  'X-VTEX-API-AppToken': appToken,
});

// Creates the base API URL from a client's account name
const getBaseUrl = (accountName: string) => {
    if (!accountName) {
        throw new Error('Missing VTEX account name.');
    }
    return `https://${accountName}.vtexcommercestable.com.br/api/oms/pvt/orders`;
}

// Fetches a single detailed order, now using a specific client config
async function getSingleVtexOrder(orderId: string, clientConfig: ClientConfig): Promise<any> {
  const baseUrl = getBaseUrl(clientConfig.vtex_account_name);
  const url = `${baseUrl}/${orderId}`;
  const headers = getVtexApiHeaders(clientConfig.vtex_app_key, clientConfig.vtex_app_token);
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error fetching details for order ${orderId} for client ${clientConfig.name}:`, error);
    return null;
  }
}

/**
 * Fetches all orders from VTEX for a specific client and enriches them with detailed data.
 * @param clientConfig The configuration object for the client.
 * @returns A list of flattened and detailed order objects.
 */
export async function getVtexOrders(clientConfig: ClientConfig): Promise<Record<string, any>[]> {
  const baseUrl = getBaseUrl(clientConfig.vtex_account_name);
  const headers = getVtexApiHeaders(clientConfig.vtex_app_key, clientConfig.vtex_app_token);

  console.log(`Fetching initial order list for ${clientConfig.name}...`);

  const listResponse = await axios.get(`${baseUrl}?orderBy=creationDate,desc&f_status=invoiced&page=1&per_page=50`, {
    headers
  });

  if (!listResponse.data || !listResponse.data.list) {
    console.log(`No orders found for ${clientConfig.name}.`);
    return [];
  }

  const orderList = listResponse.data.list;
  console.log(`Found ${orderList.length} orders for ${clientConfig.name}. Fetching details...`);

  const detailedOrdersPromises = orderList.map((order: any) => getSingleVtexOrder(order.orderId, clientConfig));
  const detailedOrders = await Promise.all(detailedOrdersPromises);

  const flattenedOrders = detailedOrders
    .filter((order): order is object => order !== null)
    .map(flattenVtexOrder);

  console.log(`Successfully processed ${flattenedOrders.length} orders for ${clientConfig.name}.`);
  return flattenedOrders;
}
