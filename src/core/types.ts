export type ProductResponse = {
    "products": Product[]
}

export type Product = {
    "id": string,
    "title": string,
    "price": number,
    "inventory": number,
    "created_at": string
}

export type ProductStats = {
    "endpoint_response_times_ms": {
        "average": number,
        "max": number,
        "min": number
    },
    "total_endpoint_calls": number,
    "average_shopify_call_responsetime_ms": number,
    "total_shopify_api_calls": number
}