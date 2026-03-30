// SPEC: ai-brief.md
// AWS-MIGRATION: When moving to Amazon Bedrock, install `@anthropic-ai/bedrock-sdk`,
// set AI_PROVIDER=bedrock + AWS_REGION + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY,
// and uncomment the bedrock branch below. The rest of the codebase imports this
// singleton and will switch automatically — no other files need to change.
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY is not set. Add it to .env.local to use AI features."
  );
}

// AWS-MIGRATION: swap this block for the Bedrock branch when ready:
// import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
// const claude = new AnthropicBedrock(); // reads AWS_* env vars automatically

const claude = new Anthropic({ apiKey });

export default claude;
