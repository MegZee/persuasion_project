import { SSTConfig } from "sst";
import { NextjsSite, StackContext } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "facebook-ads-react",
      region: "ap-southeast-2",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }: StackContext) {
      const site = new NextjsSite(stack, "site", {
        path: ".",
        environment: {
          NEXT_PUBLIC_API_URL: process.env.API_URL,
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;