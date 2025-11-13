# Portfolio Track - Mobile App Integration Quick Start

Quick start guide for integrating Portfolio Track API into iOS and Android apps.

## Table of Contents
- [Base Configuration](#base-configuration)
- [Authentication Setup](#authentication-setup)
- [Swift (iOS) Examples](#swift-ios-examples)
- [Kotlin (Android) Examples](#kotlin-android-examples)
- [React Native Examples](#react-native-examples)
- [Flutter Examples](#flutter-examples)
- [Common Use Cases](#common-use-cases)

---

## Base Configuration

### API Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

### Required Headers
```
Content-Type: application/json
X-User-Id: user@example.com (for backward compatibility)
Cookie: auth_token=... (JWT token, preferred)
```

---

## Authentication Setup

### Flow Diagram
```
1. User enters credentials
2. POST /api/auth/signin
3. Store JWT token securely
4. Include token in subsequent requests
5. On 401, redirect to login
```

---

## Swift (iOS) Examples

### 1. Setup API Client

```swift
import Foundation

class PortfolioAPI {
    static let shared = PortfolioAPI()
    private let baseURL = "https://your-domain.com/api"
    
    private init() {}
    
    // Store token in Keychain (recommended)
    private func saveToken(_ token: String) {
        // Use KeychainAccess or similar library
        UserDefaults.standard.set(token, forKey: "authToken")
    }
    
    private func getToken() -> String? {
        return UserDefaults.standard.string(forKey: "authToken")
    }
    
    private func makeRequest<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        completion: @escaping (Result<T, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }
            
            do {
                let decoded = try JSONDecoder().decode(T.self, from: data)
                completion(.success(decoded))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
```

### 2. Sign In

```swift
struct SignInResponse: Codable {
    struct User: Codable {
        let name: String
        let email: String
    }
    let user: User
}

extension PortfolioAPI {
    func signIn(email: String, password: String, completion: @escaping (Result<SignInResponse, Error>) -> Void) {
        let body = ["email": email, "password": password]
        makeRequest(endpoint: "/auth/signin", method: "POST", body: body, completion: completion)
    }
}

// Usage
PortfolioAPI.shared.signIn(email: "user@example.com", password: "password") { result in
    switch result {
    case .success(let response):
        print("Welcome, \(response.user.name)")
    case .failure(let error):
        print("Login failed: \(error)")
    }
}
```

### 3. Get Portfolio

```swift
struct PortfolioStock: Codable {
    let symbol: String
    let shares: Double
    let avgBuy: Double
    let addedAt: String
}

struct PortfolioResponse: Codable {
    let portfolio: [PortfolioStock]
}

extension PortfolioAPI {
    func getPortfolio(completion: @escaping (Result<PortfolioResponse, Error>) -> Void) {
        makeRequest(endpoint: "/portfolio", method: "GET", completion: completion)
    }
}

// Usage
PortfolioAPI.shared.getPortfolio { result in
    switch result {
    case .success(let response):
        print("Portfolio has \(response.portfolio.count) stocks")
    case .failure(let error):
        print("Failed to load portfolio: \(error)")
    }
}
```

### 4. Search Symbols

```swift
struct Symbol: Codable {
    let symbol: String
    let name: String
    let sectorName: String
    let currentPrice: Double?
}

struct SearchResponse: Codable {
    let symbols: [Symbol]
    let total: Int
    let hasMore: Bool
}

extension PortfolioAPI {
    func searchSymbols(query: String, limit: Int = 10, completion: @escaping (Result<SearchResponse, Error>) -> Void) {
        let endpoint = "/symbols/search?q=\(query)&limit=\(limit)"
        makeRequest(endpoint: endpoint, method: "GET", completion: completion)
    }
}

// Usage
PortfolioAPI.shared.searchSymbols(query: "oil") { result in
    switch result {
    case .success(let response):
        response.symbols.forEach { symbol in
            print("\(symbol.symbol) - \(symbol.name)")
        }
    case .failure(let error):
        print("Search failed: \(error)")
    }
}
```

### 5. Add Stock to Portfolio

```swift
extension PortfolioAPI {
    func addStock(symbol: String, shares: Double, avgBuy: Double, completion: @escaping (Result<Bool, Error>) -> Void) {
        let body: [String: Any] = [
            "symbol": symbol,
            "shares": shares,
            "avgBuy": avgBuy
        ]
        
        makeRequest(endpoint: "/portfolio", method: "POST", body: body) { (result: Result<[String: Any], Error>) in
            switch result {
            case .success:
                completion(.success(true))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}

// Usage
PortfolioAPI.shared.addStock(symbol: "OGDC", shares: 500, avgBuy: 85.50) { result in
    switch result {
    case .success:
        print("Stock added successfully")
    case .failure(let error):
        print("Failed to add stock: \(error)")
    }
}
```

---

## Kotlin (Android) Examples

### 1. Setup API Client

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson
import java.io.IOException

class PortfolioAPI private constructor() {
    companion object {
        val instance = PortfolioAPI()
        private const val BASE_URL = "https://your-domain.com/api"
    }
    
    private val client = OkHttpClient()
    private val gson = Gson()
    private val JSON = "application/json; charset=utf-8".toMediaType()
    
    private fun getToken(): String? {
        // Retrieve from SharedPreferences or KeyStore
        return null // Implement token retrieval
    }
    
    private fun <T> makeRequest(
        endpoint: String,
        method: String = "GET",
        body: Any? = null,
        clazz: Class<T>,
        callback: (Result<T>) -> Unit
    ) {
        val url = "$BASE_URL$endpoint"
        
        val requestBuilder = Request.Builder()
            .url(url)
            .addHeader("Content-Type", "application/json")
        
        getToken()?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
        }
        
        when (method) {
            "POST", "PUT" -> {
                val json = gson.toJson(body)
                requestBuilder.method(method, json.toRequestBody(JSON))
            }
            "DELETE" -> requestBuilder.delete()
            else -> requestBuilder.get()
        }
        
        client.newCall(requestBuilder.build()).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(Result.failure(e))
            }
            
            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseBody = response.body?.string()
                    if (response.isSuccessful && responseBody != null) {
                        val result = gson.fromJson(responseBody, clazz)
                        callback(Result.success(result))
                    } else {
                        callback(Result.failure(Exception("HTTP ${response.code}")))
                    }
                } catch (e: Exception) {
                    callback(Result.failure(e))
                }
            }
        })
    }
}
```

### 2. Sign In

```kotlin
data class SignInRequest(
    val email: String,
    val password: String
)

data class User(
    val name: String,
    val email: String
)

data class SignInResponse(
    val user: User
)

fun signIn(email: String, password: String, callback: (Result<SignInResponse>) -> Unit) {
    val request = SignInRequest(email, password)
    PortfolioAPI.instance.makeRequest(
        endpoint = "/auth/signin",
        method = "POST",
        body = request,
        clazz = SignInResponse::class.java,
        callback = callback
    )
}

// Usage
signIn("user@example.com", "password") { result ->
    result.onSuccess { response ->
        println("Welcome, ${response.user.name}")
    }.onFailure { error ->
        println("Login failed: ${error.message}")
    }
}
```

### 3. Get Portfolio

```kotlin
data class PortfolioStock(
    val symbol: String,
    val shares: Double,
    val avgBuy: Double,
    val addedAt: String
)

data class PortfolioResponse(
    val portfolio: List<PortfolioStock>
)

fun getPortfolio(callback: (Result<PortfolioResponse>) -> Unit) {
    PortfolioAPI.instance.makeRequest(
        endpoint = "/portfolio",
        method = "GET",
        clazz = PortfolioResponse::class.java,
        callback = callback
    )
}

// Usage
getPortfolio { result ->
    result.onSuccess { response ->
        println("Portfolio has ${response.portfolio.size} stocks")
    }.onFailure { error ->
        println("Failed to load portfolio: ${error.message}")
    }
}
```

### 4. Add Stock

```kotlin
data class AddStockRequest(
    val symbol: String,
    val shares: Double,
    val avgBuy: Double
)

data class AddStockResponse(
    val success: Boolean,
    val message: String
)

fun addStock(symbol: String, shares: Double, avgBuy: Double, callback: (Result<AddStockResponse>) -> Unit) {
    val request = AddStockRequest(symbol, shares, avgBuy)
    PortfolioAPI.instance.makeRequest(
        endpoint = "/portfolio",
        method = "POST",
        body = request,
        clazz = AddStockResponse::class.java,
        callback = callback
    )
}

// Usage
addStock("OGDC", 500.0, 85.50) { result ->
    result.onSuccess { response ->
        println(response.message)
    }.onFailure { error ->
        println("Failed to add stock: ${error.message}")
    }
}
```

---

## React Native Examples

### 1. Setup API Client

```javascript
// api/client.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://your-domain.com/api';

class PortfolioAPI {
  async getToken() {
    return await AsyncStorage.getItem('authToken');
  }

  async setToken(token) {
    await AsyncStorage.setItem('authToken', token);
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const token = await this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['X-User-Id'] = token;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  }

  // Auth
  async signIn(email, password) {
    const result = await this.makeRequest('/auth/signin', 'POST', { email, password });
    await this.setToken(result.user.email);
    return result;
  }

  async signOut() {
    await this.makeRequest('/auth/signout', 'POST');
    await AsyncStorage.removeItem('authToken');
  }

  // Portfolio
  async getPortfolio() {
    return await this.makeRequest('/portfolio');
  }

  async addStock(symbol, shares, avgBuy) {
    return await this.makeRequest('/portfolio', 'POST', { symbol, shares, avgBuy });
  }

  async deleteStock(symbol) {
    return await this.makeRequest(`/portfolio?symbol=${symbol}`, 'DELETE');
  }

  // Symbols
  async searchSymbols(query, limit = 10) {
    return await this.makeRequest(`/symbols/search?q=${query}&limit=${limit}`);
  }

  async getSymbolMetadata(symbol) {
    return await this.makeRequest(`/symbols/metadata?symbol=${symbol}`);
  }

  // Company
  async getCompanyData(symbol) {
    return await this.makeRequest(`/companies/${symbol}`);
  }

  // Dividends
  async getDividends(symbol, limit = 10) {
    return await this.makeRequest(`/dividends/${symbol}?limit=${limit}`);
  }

  // Price History
  async getPriceHistory(symbol, interval = '1d', limit = 365) {
    return await this.makeRequest(`/klines/${symbol}?interval=${interval}&limit=${limit}`);
  }

  // Watchlist
  async getWatchlist() {
    return await this.makeRequest('/watchlist');
  }

  async addToWatchlist(symbol, thesis, targetPrice, note) {
    return await this.makeRequest('/watchlist', 'POST', { symbol, thesis, targetPrice, note });
  }
}

export default new PortfolioAPI();
```

### 2. Usage in Components

```javascript
// screens/PortfolioScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import API from '../api/client';

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const result = await API.getPortfolio();
      setPortfolio(result.portfolio);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      <FlatList
        data={portfolio}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <View>
            <Text>{item.symbol}</Text>
            <Text>Shares: {item.shares}</Text>
            <Text>Avg Buy: PKR {item.avgBuy}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

```javascript
// screens/AddStockScreen.js
import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import API from '../api/client';

export default function AddStockScreen({ navigation }) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [avgBuy, setAvgBuy] = useState('');

  const handleAdd = async () => {
    try {
      await API.addStock(symbol, parseFloat(shares), parseFloat(avgBuy));
      navigation.goBack();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <View>
      <TextInput placeholder="Symbol" value={symbol} onChangeText={setSymbol} />
      <TextInput placeholder="Shares" value={shares} onChangeText={setShares} keyboardType="numeric" />
      <TextInput placeholder="Avg Buy" value={avgBuy} onChangeText={setAvgBuy} keyboardType="numeric" />
      <Button title="Add Stock" onPress={handleAdd} />
    </View>
  );
}
```

---

## Flutter Examples

### 1. Setup API Client

```dart
// lib/api/portfolio_api.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PortfolioAPI {
  static const String baseUrl = 'https://your-domain.com/api';
  
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('authToken');
  }
  
  Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('authToken', token);
  }
  
  Future<dynamic> makeRequest(
    String endpoint, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final token = await getToken();
    final url = Uri.parse('$baseUrl$endpoint');
    
    final headers = {
      'Content-Type': 'application/json',
    };
    
    if (token != null) {
      headers['X-User-Id'] = token;
    }
    
    http.Response response;
    
    switch (method) {
      case 'POST':
        response = await http.post(url, headers: headers, body: json.encode(body));
        break;
      case 'DELETE':
        response = await http.delete(url, headers: headers);
        break;
      default:
        response = await http.get(url, headers: headers);
    }
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    } else {
      throw Exception('Request failed: ${response.body}');
    }
  }
  
  // Auth
  Future<Map<String, dynamic>> signIn(String email, String password) async {
    final result = await makeRequest('/auth/signin', method: 'POST', body: {
      'email': email,
      'password': password,
    });
    await setToken(result['user']['email']);
    return result;
  }
  
  // Portfolio
  Future<List<dynamic>> getPortfolio() async {
    final result = await makeRequest('/portfolio');
    return result['portfolio'];
  }
  
  Future<void> addStock(String symbol, double shares, double avgBuy) async {
    await makeRequest('/portfolio', method: 'POST', body: {
      'symbol': symbol,
      'shares': shares,
      'avgBuy': avgBuy,
    });
  }
  
  // Symbols
  Future<Map<String, dynamic>> searchSymbols(String query, {int limit = 10}) async {
    return await makeRequest('/symbols/search?q=$query&limit=$limit');
  }
}
```

### 2. Usage in Widgets

```dart
// lib/screens/portfolio_screen.dart
import 'package:flutter/material.dart';
import '../api/portfolio_api.dart';

class PortfolioScreen extends StatefulWidget {
  @override
  _PortfolioScreenState createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  final api = PortfolioAPI();
  List<dynamic> portfolio = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    loadPortfolio();
  }

  Future<void> loadPortfolio() async {
    try {
      setState(() => loading = true);
      final data = await api.getPortfolio();
      setState(() {
        portfolio = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return Center(child: CircularProgressIndicator());
    if (error != null) return Center(child: Text('Error: $error'));

    return ListView.builder(
      itemCount: portfolio.length,
      itemBuilder: (context, index) {
        final stock = portfolio[index];
        return ListTile(
          title: Text(stock['symbol']),
          subtitle: Text('Shares: ${stock['shares']}'),
          trailing: Text('PKR ${stock['avgBuy']}'),
        );
      },
    );
  }
}
```

---

## Common Use Cases

### 1. Dashboard Screen

**Data to Fetch:**
```
1. GET /api/portfolio
2. POST /api/symbols/metadata (batch with all symbols)
3. GET /api/analytics
4. GET /api/indices (for market overview)
```

### 2. Stock Detail Screen

**Data to Fetch:**
```
1. GET /api/symbols/metadata?symbol=OGDC
2. GET /api/companies/OGDC
3. GET /api/dividends/OGDC?limit=10
4. GET /api/klines/OGDC?interval=1d&limit=365
```

### 3. Search and Add Flow

**Steps:**
```
1. User types in search box
2. Debounce for 300ms
3. GET /api/symbols/search?q=<query>
4. Display results
5. User selects stock
6. Show add form
7. POST /api/portfolio with stock details
8. Refresh portfolio
```

### 4. Pull to Refresh

**Implementation:**
```javascript
const onRefresh = async () => {
  setRefreshing(true);
  try {
    await Promise.all([
      loadPortfolio(),
      loadWatchlist(),
      refreshPrices()
    ]);
  } finally {
    setRefreshing(false);
  }
};
```

### 5. Offline Support

**Strategy:**
```
1. Cache portfolio data locally
2. Queue write operations when offline
3. Sync queue when connection restored
4. Show cached data with "Last updated" timestamp
5. Use background sync for automatic updates
```

---

## Testing

### Test User Credentials
```
Email: test@example.com
Password: test123
```

### Postman Collection
Import the API endpoints into Postman for testing before mobile integration.

### Mock Server
Use JSON Server or similar to mock API responses during development.

---

## Support

For issues or questions:
- Review full API docs: `API_DOCUMENTATION.md`
- Check backend code: `/app/api/`
- Contact backend team

---

## Next Steps

1. Set up authentication in your mobile app
2. Implement portfolio display screen
3. Add stock search and add functionality
4. Implement watchlist features
5. Add analytics dashboard
6. Integrate real-time price updates
7. Implement offline support
8. Add push notifications (future)

Happy coding! 🚀

