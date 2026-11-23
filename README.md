# Tensorcade

> **Learn Python, Data Science, and Machine Learning through Interactive Games.**

Tensorcade is an interactive browser platform designed for university students and career switchers to master modern computing and machine learning. In Tensorcade, **the game mechanic is the concept**—abstract ideas like learning rates, loss surfaces, array slicing, and tokenization are experienced directly through gameplay.

---

## 🎮 Core Philosophy

1. **The Mechanic Is the Concept** — Every gameplay loop directly mirrors the underlying computational or mathematical concept (e.g. rolling on a loss landscape with step-size tuning to learn gradient descent).
2. **One Level, Three Modes**:
   - **Explorer Mode**: Visual block-based programming with real generated Python visible.
   - **Builder Mode**: Structured code assembly (Parsons problems) focusing on logic and control flow without syntax stumbling blocks.
   - **Hacker Mode**: Production Python editor with linting, instant feedback, and property-based verification.
3. **Deterministic Simulation**:
   - Simulation state and graphics rendering are completely decoupled.
   - Pure, deterministic simulation engine ensures reproducible runs, instant replays, and verifiable scores.
4. **Local-First & Secure**:
   - Learner code executes entirely in an isolated browser Web Worker running Pyodide (WebAssembly Python).
   - No untrusted user code runs on backend servers.
   - Fully playable offline after initial asset caching.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | pnpm workspaces + Turborepo |
| **Language** | TypeScript (strict), Python 3.12+ (runtime & parity fixtures) |
| **Simulation Engine** | Pure TypeScript, fixed-timestep, deterministic PRNG |
| **2D Renderer** | PixiJS v8 (WebGPU / WebGL2 auto-fallback) |
| **3D Renderer** | Three.js / React Three Fiber |
| **Python Runtime** | Pyodide in dedicated Web Worker (Comlink) |
| **Editors** | Monaco Editor (Hacker) & Blockly (Explorer) |
| **Styling & UI** | Tailwind CSS + Radix UI accessible primitives |

---

## 🗺️ Curriculum Worlds

- **World 1: Python Foundations** (Sequences, conditionals, loops, functions, structured data)
- **World 2: Data Science Lifecycle** (NumPy multi-dimensional arrays, Pandas data manipulation, cleaning, visualization)
- **World 3: Machine Learning Foundations** (Loss functions, gradient descent, train/test validation, classification metrics, k-NN, decision trees)
- **World 4: Reinforcement Learning** (Reward modeling, Q-learning, exploration vs exploitation)
- **World 5: Modern AI & Language Systems** (Embeddings, tokenization, search & retrieval/RAG, agent loops)

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
