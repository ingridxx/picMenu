/* eslint-disable @typescript-eslint/no-explicit-any */
import { Together } from "together-ai";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

// Add observability if a Helicone key is specified, otherwise skip
const options: ConstructorParameters<typeof Together>[0] = {};
if (process.env.HELICONE_API_KEY) {
  options.baseURL = "https://together.helicone.ai/v1";
  options.defaultHeaders = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-MENU": "true",
  };
}

const together = new Together(options);

// Food category prompts
const CATEGORY_PROMPTS = {
  "fine-dining": `Elegant fine dining presentation, white porcelain plate, sophisticated plating, garnished with microgreens and artistic sauce drizzles, restaurant quality lighting, premium ingredients visible, refined composition`,
  "fast-food": `Classic fast food style, wrapped in branded paper or served in takeout container, casual presentation, vibrant colors, appetizing and indulgent look, commercial food photography style`,
  "to-go": `Ready-to-eat takeout presentation, eco-friendly packaging, practical portions, fresh and convenient appearance, grab-and-go style, clean packaging design`,
  "home-style": `Comfort food presentation, homemade appearance, served on casual dinnerware, warm and inviting, generous portions, family-style cooking, cozy home kitchen aesthetic`
} as const;

// Available models
const AVAILABLE_MODELS = {
  "flux-1.1-pro": "black-forest-labs/FLUX.1.1-pro",
  "krea-dev": "black-forest-labs/FLUX.1-krea-dev", 
  "kontext-pro": "black-forest-labs/FLUX.1-kontext-pro",
  "kontext-max": "black-forest-labs/FLUX.1-kontext-max",
  "kontext-dev": "black-forest-labs/FLUX.1-kontext-dev"
} as const;

type FoodCategory = keyof typeof CATEGORY_PROMPTS;
type ModelOption = keyof typeof AVAILABLE_MODELS;

export async function POST(request: Request) {
  try {
    const { menuUrl, category = "fine-dining", model = "flux-1.1-pro" } = await request.json();

    console.log({ menuUrl, category, model });

    if (!menuUrl) {
      return Response.json({ error: "No menu URL provided" }, { status: 400 });
    }

    // Validate category
    const selectedCategory = category as FoodCategory;
    if (!CATEGORY_PROMPTS[selectedCategory]) {
      return Response.json({ error: "Invalid category provided" }, { status: 400 });
    }

    // Validate model
    const selectedModel = model as ModelOption;
    if (!AVAILABLE_MODELS[selectedModel]) {
      return Response.json({ error: "Invalid model provided" }, { status: 400 });
    }

  // Defining the schema we want our data in
  const menuSchema = z.array(
    z.object({
      name: z.string().describe("The name of the menu item"),
      price: z.string().describe("The price of the menu item"),
      description: z
        .string()
        .describe(
          "The description of the menu item. If this doesn't exist, please write a short one sentence description."
        ),
    })
  );
  const jsonSchema = zodToJsonSchema(menuSchema, "menuSchema");

  const systemPrompt = `You are given an image of a menu. Extract each menu item and return them in JSON format. Include the name, price (if available), and description (if available - otherwise create a short one). Return only valid JSON.`;

  const output = await together.chat.completions.create({
    model: "Qwen/Qwen2.5-VL-72B-Instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: systemPrompt },
          {
            type: "image_url",
            image_url: {
              url: menuUrl,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object", schema: jsonSchema },
  } as any);

  let menuItemsJSON;
  if (output?.choices?.[0]?.message?.content) {
    menuItemsJSON = JSON.parse(output?.choices?.[0]?.message?.content);
    console.log({ menuItemsJSON });
  }

  // Check if we successfully extracted menu items
  if (!menuItemsJSON || !Array.isArray(menuItemsJSON) || menuItemsJSON.length === 0) {
    console.error("No menu items extracted from image");
    return Response.json({ error: "Could not extract menu items from image" }, { status: 400 });
  }

  // Process images in small batches to balance speed and rate limits
  // With 57 QPM, we can safely do 3 concurrent requests with buffer for safety
  const BATCH_SIZE = 3;
  
  console.log(`Starting image generation for ${menuItemsJSON.length} items in batches of ${BATCH_SIZE}`);
  const totalStartTime = Date.now();
  
  for (let i = 0; i < menuItemsJSON.length; i += BATCH_SIZE) {
    const batch = menuItemsJSON.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(menuItemsJSON.length / BATCH_SIZE);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} items`);
    const batchStartTime = Date.now();
    
    // Process current batch in parallel
    const batchPromises = batch.map(async (item: any) => {
      console.log("processing image for:", item.name);
      const categoryPrompt = CATEGORY_PROMPTS[selectedCategory];
      const modelName = AVAILABLE_MODELS[selectedModel];
      const response = await together.images.create({
        prompt: `${item.name} — ${item.description}.
        ${categoryPrompt}.
        No background blur, crisp details, high-resolution food photography, color-accurate.
        No vignette, no grain, no filters, no frame, no text, no watermark.`,
        model: modelName,
        width: 1024,
        height: 768,
        steps: 8,
        n: 1,
        // @ts-expect-error - this is not typed in the API
        response_format: "base64",
      });
      item.menuImage = response.data[0];
      return item;
    });
    
    // Wait for current batch to complete before starting next batch
    await Promise.all(batchPromises);
    
    const batchEndTime = Date.now();
    const batchDuration = (batchEndTime - batchStartTime) / 1000;
    console.log(`Batch ${batchNumber} completed in ${batchDuration.toFixed(2)} seconds`);
    
    // Add a small delay between batches to be extra safe with rate limits
    if (i + BATCH_SIZE < menuItemsJSON.length) {
      console.log("Waiting 1 second before next batch...");
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  const totalEndTime = Date.now();
  const totalDuration = (totalEndTime - totalStartTime) / 1000;
  console.log(`✅ All ${menuItemsJSON.length} images generated in ${totalDuration.toFixed(2)} seconds total`);

  return Response.json({ menu: menuItemsJSON });
  } catch (error) {
    console.error("Error processing menu:", error);
    return Response.json(
      { error: "Failed to process menu image" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
