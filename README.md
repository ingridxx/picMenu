<a href="https://www.picmenu.co">
  <img alt="PicMenu" src="./public/og-image.png">
  <h1 align="center">PicMenu 2.0</h1>
</a>

<p align="center">
  Upload a photo of your restaurant menu and generate personalized, realistic images for each dish.
</p>

## Features

- **Menu Text Extraction**: Upload a photo of any menu and the LLM will extract all menu items with names, prices, and descriptions
- **Smart Image Generation**: Generate food images in different presentation styles (fine dining, fast food, takeout, home-style)
- **Multiple AI Models**: Choose from FLUX 1.1 Pro, FLUX Krea Dev, or FLUX Kontext Pro for different image generation styles
- **Search & Filter**: Easily search through generated menu items
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech stack

- [Qwen 2.5 VL 72B](https://www.together.ai/models/qwen2-5-vl-72b-instruct) on Together AI to extract menu items from images
- [FLUX 1.1 Pro](https://www.together.ai/models/flux1-1-pro) on Together AI for high-quality image generation (default)
- [FLUX Krea Dev](https://www.together.ai/models/flux-1-krea-dev) on Together AI for fast and creative image generation
- [FLUX Kontext Pro](https://www.together.ai/models/flux-1-kontext-pro) on Together AI for context-aware image generation
- [Next.js](https://nextjs.org/) with TypeScript for the app framework
- [Shadcn](https://ui.shadcn.com/) for UI components & [Tailwind](https://tailwindcss.com/) for styling
- [Plausible](https://plausible.io/) & [Helicone](https://helicone.ai/) for analytics & observability

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/picmenu`
2. Create a `.env` file and add your [Together AI API key](https://api.together.xyz/settings/api-keys): `TOGETHER_API_KEY=`
3. Create an S3 bucket and add the credentials to your `.env` file. Follow [this guide](https://next-s3-upload.codingvalue.com/setup) to set them up. All required values are in the `.env.example` file.
4. Run `npm install` and `npm run dev` to install dependencies and run locally.

