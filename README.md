# AI Meal Planner API

A RESTful backend service that uses **Google Gemini AI** to suggest personalized meal ideas based on a user's available ingredients, dietary preferences, and meal history. Built with Node.js, TypeScript, Express, and MongoDB.

---

## Features

- **AI-Powered Meal Suggestions** — Integrates with Google Gemini 2.5 Flash to generate 3 diverse meal recommendations tailored to what you have on hand
- **Smart Preference Learning** — Automatically detects and saves new likes/dislikes from meal feedback over time
- **Expiry-Aware Planning** — Prioritizes ingredients that are expiring soon to reduce food waste
- **Meal History Tracking** — Logs meals with ratings, feedback, and notes; avoids suggesting recently eaten or disliked meals
- **Calorie Targeting** — Supports low / medium / high calorie preferences per user
- **JWT Authentication** — Secure registration and login with automatic token refresh
- **Inventory Management** — Track pantry, fridge, and freezer items with expiry dates

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Database | MongoDB (via native driver) |
| AI | Google Gemini API (`@google/generative-ai`) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Dev Tools | tsx, nodemon |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Google Gemini API key

### Installation

```bash
git clone https://github.com/GlaceChiril/AI-bot-training.git
cd AI-bot-training
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive a JWT |

### Meals

All meal endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/meals/suggest` | Get AI meal suggestions |
| `POST` | `/api/meals/save` | Save a meal to history |
| `GET` | `/api/meals/history` | Retrieve meal history |
| `PATCH` | `/api/meals/:mealId` | Update meal rating / notes |
| `DELETE` | `/api/meals/:mealId` | Delete a meal |
| `GET` | `/api/meals/preferences` | Get user preferences |
| `PUT` | `/api/meals/preferences` | Update user preferences |
| `DELETE` | `/api/meals/preferences/item` | Remove a specific preference item |

### Example: Get Meal Suggestions

**Request**
```http
POST /api/meals/suggest
Authorization: Bearer <token>
Content-Type: application/json

{
  "ingredients": {
    "pantry": ["pasta", "olive oil", "garlic", "canned tomatoes"],
    "fridge": ["eggs", "parmesan", "spinach"],
    "expiringSoon": ["spinach"]
  },
  "caloriePreference": "medium"
}
```

**Response**
```json
{
  "success": true,
  "suggestions": [
    {
      "mealName": "Spinach & Garlic Pasta",
      "description": "A light pasta dish that uses up the spinach before it turns.",
      "ingredients": ["pasta", "spinach", "garlic", "olive oil", "parmesan"],
      "estimatedTime": "20 minutes",
      "difficulty": "easy",
      "estimatedCalories": 520,
      "expiringIngredientsUsed": ["spinach"]
    }
  ],
  "newLikes": ["pasta dishes"],
  "newDislikes": []
}
```

---

## Project Structure

```
src/
├── index.ts                  # App entry point
├── router.ts                 # Route registration
├── middleware/
│   └── auth.ts               # JWT authentication middleware
├── routes/
│   ├── authRoutes.ts
│   └── mealRoutes.ts
├── repositories/
│   ├── userRepository.ts
│   ├── mealRepository.ts
│   ├── preferencesRepository.ts
│   └── inventoryRepository.ts
├── services/
│   ├── db.ts                 # MongoDB connection
│   ├── geminiService.ts      # Gemini AI integration
│   └── authService.ts        # JWT utilities
└── types/
    └── database.ts           # Shared TypeScript interfaces
```

---

## Authentication Flow

- Tokens are valid for **7 days** on initial login
- Tokens are automatically refreshed (new token returned in `X-New-Token` header) when within **2 days of expiry**
- `lastActive` timestamp is updated per user, throttled to once per hour

---

## Notes

- Meal history is capped at **100 entries** per user (oldest are auto-deleted)
- Preference lists (likes/dislikes) are capped at **100 items** each
- The AI prompt is designed to avoid repetitive suggestions and respect negative feedback
