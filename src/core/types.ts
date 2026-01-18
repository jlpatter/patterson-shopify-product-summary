export type ProductZScore = {
    "value": string,
    "score": number,
};
export type ProductResponse = Product[];

export type ShopifyProduct = {
    id: string,
    title: string,
    priceRangeV2: {
        minVariantPrice: {
            amount: number,
            currencyCode: string
        },
        maxVariantPrice: {
            amount: number,
            currencyCode: string
        },
    },
    totalInventory: number,
    createdAt: string
}

export type Product = {
    "id": string,
    "title": string,
    "price": number,
    "inventory": number,
    "created_at": string
};

export type EndpointStats = {
    "endpoint_response_times_ms": {
        "average": number,
        "max": number,
        "min": number
    },
    "total_endpoint_calls": number,
}

export type ShopifyStats = {
    "average_shopify_call_responsetime_ms": number,
    "total_shopify_api_calls": number,
}

export type ProductStats = EndpointStats & ShopifyStats;
