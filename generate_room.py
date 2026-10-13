
import torch
from diffusers import StableDiffusionPipeline

MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"

prompt = """
Photorealistic modern minimalist living room interior,
warm beige walls, elegant cream sofa, natural oak furniture,
large windows, soft daylight, tasteful indoor plants,
realistic materials, professional interior photography,
balanced composition, highly detailed.
"""

negative_prompt = """
cartoon, illustration, blurry, distorted furniture,
warped walls, unrealistic proportions, low quality
"""

print("Loading Stable Diffusion 1.5...")
print("This downloads several GB the first time.")

pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    use_safetensors=True,
)

pipe = pipe.to("mps")
pipe.enable_attention_slicing()

print("Generating your first room image...")

generator = torch.Generator(device="cpu").manual_seed(42)

result = pipe(
    prompt=prompt,
    negative_prompt=negative_prompt,
    width=512,
    height=512,
    num_inference_steps=20,
    guidance_scale=7.0,
    generator=generator,
)

output_path = "modern_living_room.png"
result.images[0].save(output_path)

print(f"Done! Image saved to: {output_path}")

