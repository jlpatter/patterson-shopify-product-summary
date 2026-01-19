import * as sdk from "../src";
import { getRedisClient } from "../src/core/redis_client";
import axios from "axios";

const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    json: {
        get: jest.fn(),
        set: jest.fn(),
    },
    zRangeByScoreWithScores: jest.fn(),
    zRangeWithScores: jest.fn(),
    exists: jest.fn(),
    multi: jest.fn(() => {
        return {
            json: {
                get: jest.fn(),
                set: jest.fn(),
            },
            exec: jest.fn(),
            zAdd: jest.fn(),
        };
    }),
    eval: jest.fn(),
};

jest.mock("../src/core/redis_client", () => ({
    getRedisClient: jest.fn(() => mockRedisClient),
}));

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Before each test, mock the caching of all the products WITHOUT using the external API.
beforeEach(() => {
    mockRedisClient.zRangeByScoreWithScores.mockResolvedValue([
        { value: "gid://shopify/Product/12345", score: 1 },
        { value: "gid://shopify/Product/23456", score: 2 },
        { value: "gid://shopify/Product/34567", score: 3 },
    ]);
    // Since this is used with `REV: true`, I'm just going to manually reverse the entries.
    mockRedisClient.zRangeWithScores.mockResolvedValue([
        { value: "gid://shopify/Product/34567", score: 3 },
        { value: "gid://shopify/Product/23456", score: 2 },
        { value: "gid://shopify/Product/12345", score: 1 },
    ]);
    mockRedisClient.multi.mockReturnValue({
        json: {
            get: jest.fn(),
            set: jest.fn(),
        },
        exec: jest.fn(() => {
            return [
                {
                    id: "gid://shopify/Product/12345",
                    title: '"Hello, World!" Notebook',
                    price: "12.0",
                    inventory: 100,
                    created_at: "2025-10-06T22:12:35Z",
                },
                {
                    id: "gid://shopify/Product/23456",
                    title: "404: Socks Not Found Crew Socks",
                    price: "0.0",
                    inventory: 0,
                    created_at: "2025-12-02T16:51:09Z",
                },
                {
                    id: "gid://shopify/Product/34567",
                    title: "8-Bit Monster Enamel Mug",
                    price: "0.0",
                    inventory: 0,
                    created_at: "2025-12-02T16:59:15Z",
                },
            ];
        }),
        zAdd: jest.fn(),
    });

    mockedAxios.post.mockResolvedValue({
        data: {
            data: {
                products: {
                    nodes: [
                        {
                            id: "gid://shopify/Product/12345",
                            title: '"404 Not Found" Coffee Mug',
                            priceRangeV2: {
                                minVariantPrice: {
                                    amount: "14.99",
                                    currencyCode: "USD",
                                },
                                maxVariantPrice: {
                                    amount: "14.99",
                                    currencyCode: "USD",
                                },
                            },
                            totalInventory: 20,
                            createdAt: "2025-10-06T22:08:07Z",
                        },
                        {
                            id: "gid://shopify/Product/23456",
                            title: '"Hello, World!" Notebook',
                            priceRangeV2: {
                                minVariantPrice: {
                                    amount: "12.0",
                                    currencyCode: "USD",
                                },
                                maxVariantPrice: {
                                    amount: "12.0",
                                    currencyCode: "USD",
                                },
                            },
                            totalInventory: 100,
                            createdAt: "2025-10-06T22:12:35Z",
                        },
                        {
                            id: "gid://shopify/Product/34567",
                            title: "404: Socks Not Found Crew Socks",
                            priceRangeV2: {
                                minVariantPrice: {
                                    amount: "0.0",
                                    currencyCode: "USD",
                                },
                                maxVariantPrice: {
                                    amount: "0.0",
                                    currencyCode: "USD",
                                },
                            },
                            totalInventory: 0,
                            createdAt: "2025-12-02T16:51:09Z",
                        },
                    ],
                    pageInfo: {
                        hasPreviousPage: false,
                        hasNextPage: true,
                        startCursor: "abcdef",
                        endCursor: "ghijkl",
                    },
                },
            },
        },
    });
});

test("redis get is mocked", async () => {
    mockRedisClient.get.mockResolvedValue("123");

    const redis = await getRedisClient();
    const value = await redis.get("someKey");

    expect(value).toBe("123");
});

test("getProducts happy path works", async () => {
    const result = await sdk.getProducts();
    expect(result.products.length).toBe(3);
    expect(result.products[0].id).toBe("gid://shopify/Product/12345");
    expect(result.products[1].id).toBe("gid://shopify/Product/23456");
    expect(result.products[2].id).toBe("gid://shopify/Product/34567");
});

test("getProductById happy path works", async () => {
    mockRedisClient.json.get.mockResolvedValue({
        id: "gid://shopify/Product/12345",
        title: '"Hello, World!" Notebook',
        price: "12.0",
        inventory: 100,
        created_at: "2025-10-06T22:12:35Z",
    });

    const result = await sdk.getProductById("12345");
    expect(result.id).toBe("gid://shopify/Product/12345");
});

test("getStats happy path works", async () => {
    mockRedisClient.json.get.mockImplementation((key) => {
        if (key === "endpointStats") {
            return Promise.resolve({
                endpoint_response_times_ms: {
                    average: 25,
                    max: 30,
                    min: 5,
                },
                total_endpoint_calls: 8,
            });
        } else if (key === "shopifyStats") {
            return Promise.resolve({
                average_shopify_call_responsetime_ms: 350,
                total_shopify_api_calls: 2,
            });
        } else {
            fail("This shouldn't be called except to get stats!");
        }
    });

    // Call the getProducts endpoint first so we have some stat data.
    await sdk.getProducts();

    const result = await sdk.getStats();
    expect(result.endpoint_response_times_ms.average).toBe(25);
    expect(result.endpoint_response_times_ms.max).toBe(30);
    expect(result.endpoint_response_times_ms.min).toBe(5);
    expect(result.total_endpoint_calls).toBe(8);
    expect(result.average_shopify_call_responsetime_ms).toBe(350);
    expect(result.total_shopify_api_calls).toBe(2);
});

afterEach(() => {
    // Reset functions that were mocked in tests.
    mockRedisClient.get = jest.fn();
    mockRedisClient.json.get = jest.fn();
});
