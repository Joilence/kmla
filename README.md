# kmla

A simple analysis tool for Keyboard Maestro usage logs on macro usage, keyboard activity, and time patterns.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/jyang-default/kmla)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/9jednIVl57y)

<p align="center">
  <img src="assets/2.png" alt="kmla Application Screenshot" width="70%" style="box-shadow: 5px 5px 15px grey; border-radius: 15px;">
</p>

<details>
<summary>More screenshots</summary>
  <p align="center">
    <img src="assets/1.png" alt="kmla Application Screenshot" width="70%" style="box-shadow: 5px 5px 15px grey; border-radius: 15px;">
  </p>
  <p align="center">
    <img src="assets/3.png" alt="kmla Application Screenshot" width="70%" style="box-shadow: 5px 5px 15px grey; border-radius: 15px;">
  </p>
</details>

## Quick Start

[v0 deployment](https://kmla-jyang-default.vercel.app)

### Run locally

```bash
git clone https://github.com/Joilence/kmla.git
cd kmla

# install bun
brew tap oven-sh/bun
brew install bun

# install dependencies
bun install

# run the app
bun dev
```

## Usage

Upload log file from: `~/Library/Logs/Keyboard Maestro/Engine.log`, and explore the data.

## Development

This project was initially built with [v0.dev](https://v0.dev), and continued crafting locally.
