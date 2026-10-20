# 📊 Smart Excel & Property Manager

A modern, high-performance web application designed to search, filter, analyze, and manage large-scale spreadsheet datasets and real-estate property deeds with zero latency.

---

## ⚡ Key Features

- **Blazing Fast In-Memory Engine:** Sub-millisecond indexed search across 3,500+ records.
- **Multilingual Phonetic Search:** Seamless cross-lingual matching between English and Marathi (e.g., `dnyandeep` ⇄ `ज्ञानदीप`, `shlesha` ⇄ `श्लेषा`, `suryavanshi` ⇄ `सूर्यवंशी`).
- **Smart Property Field Extractor:** Automatically extracts Society/Project, Flat/Unit Number, Carpet Area (sq.ft), Rate per sq.ft, and cleaned Buyer/Seller parties from raw legal property deed descriptions.
- **Side-by-Side Multi-Filter Drilldown:**
  - 🔍 Primary Global Keyword Search
  - 🏢 Project / Society Dropdown
  - 📅 Registration Year Dropdown
  - 📜 Deed / Document Type Dropdown
  - 🚪 Flat / Unit Number Input
  - 💰 Price Range Filter (Under ₹25L, ₹25L–₹50L, ₹50L–₹75L, ₹75L–₹1Cr, >₹1Cr)
  - 📐 Carpet Area Filter (<450 sq.ft, 1 BHK, 2 BHK, 3 BHK+)
- **Dual Display Modes:**
  - ⊞ **Table View:** Full-featured data grid with column picker and multi-type column sorting.
  - 🗂️ **Card View:** Responsive, mobile-first property cards with financial highlights.
- **Visual KPI Dashboard:** Real-time analytics, total consideration turnover, top societies, and average rates.
- **Unicode-Safe Exports:** Download filtered datasets to Excel (`.xlsx`) or UTF-8 BOM CSV (`.csv`) without character corruption in Windows Excel.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/utkarshnikhare/excel-manager.git
   cd excel-manager
   ```

2. **Navigate to the frontend and install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🛠️ Tech Stack
- **Frontend Framework:** React 19, Vite
- **Styling:** CSS3 variables with Light/Dark theme support
- **Data Engine:** Custom phonetic transliteration & inverted fuzzy search indexing
- **Spreadsheet Processing:** Dynamic code-split XLSX engine
