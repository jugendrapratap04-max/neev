/** NEEV — theme lifted verbatim from the chosen Stitch template (Nexora homepage),
 *  plus four additions: surface-warm (used by the brief pages), whatsapp, success, accent.
 *  Do not hand-edit colours here; this is the single source of design truth. */
module.exports = {
  content: ["./*.html", "./assets/js/**/*.js"],
  darkMode: "class",
  theme: { extend: {
    "colors": {
      "secondary-fixed-dim": "#b4c5ff",
      "tertiary-fixed": "#ffdad3",
      "on-secondary-container": "#fefcff",
      "surface-variant": "#dce2f3",
      "on-primary-container": "#7f8895",
      "on-secondary-fixed": "#00174b",
      "on-secondary": "#ffffff",
      "on-tertiary-container": "#e95538",
      "on-surface-variant": "#45474b",
      "secondary": "#0051d5",
      "surface-container-low": "#f0f3ff",
      "error": "#ba1a1a",
      "surface-container-lowest": "#ffffff",
      "inverse-on-surface": "#ebf1ff",
      "on-error": "#ffffff",
      "surface-dim": "#d3daea",
      "on-error-container": "#93000a",
      "primary-fixed": "#dbe3f2",
      "surface-bright": "#f9f9ff",
      "tertiary-fixed-dim": "#ffb4a4",
      "primary-container": "#18202b",
      "outline": "#75777c",
      "primary": "#020812",
      "on-tertiary-fixed-variant": "#8d1600",
      "on-background": "#151c27",
      "primary-fixed-dim": "#bfc7d6",
      "surface-container-high": "#e2e8f8",
      "error-container": "#ffdad6",
      "outline-variant": "#c5c6cc",
      "secondary-fixed": "#dbe1ff",
      "on-tertiary-fixed": "#3e0500",
      "on-primary-fixed-variant": "#3f4754",
      "on-secondary-fixed-variant": "#003ea8",
      "inverse-surface": "#2a313d",
      "tertiary": "#180100",
      "on-tertiary": "#ffffff",
      "background": "#f9f9ff",
      "surface": "#f9f9ff",
      "inverse-primary": "#bfc7d6",
      "on-primary-fixed": "#141c27",
      "on-surface": "#151c27",
      "surface-container": "#e7eefe",
      "surface-tint": "#575f6c",
      "on-primary": "#ffffff",
      "surface-container-highest": "#dce2f3",
      "tertiary-container": "#450600",
      "secondary-container": "#316bf3",
      "surface-warm": "#f6f3ed",
      "surface-warm-container": "#efeae0",
      "whatsapp": "#0f7b45",
      "whatsapp-bright": "#25D366",
      "whatsapp-dark": "#0b6e3f",
      "success": "#0f7b45",
      "success-container": "#dff3e6",
      "accent": "#e95538"
    },
    "borderRadius": {
      "DEFAULT": "0.25rem",
      "lg": "0.5rem",
      "xl": "0.75rem",
      "full": "9999px"
    },
    "spacing": {
      "gutter": "24px",
      "unit": "8px",
      "section-gap": "80px",
      "container-max": "1280px",
      "margin-mobile": "16px",
      "margin-desktop": "40px"
    },
    "fontFamily": {
      "body-lg": [
        "Inter"
      ],
      "display-lg": [
        "Inter"
      ],
      "label-md": [
        "Inter"
      ],
      "label-sm": [
        "Inter"
      ],
      "display-lg-mobile": [
        "Inter"
      ],
      "headline-lg": [
        "Inter"
      ],
      "headline-md": [
        "Inter"
      ],
      "body-md": [
        "Inter"
      ]
    },
    "fontSize": {
      "body-lg": [
        "18px",
        {
          "lineHeight": "28px",
          "letterSpacing": "0",
          "fontWeight": "400"
        }
      ],
      "display-lg": [
        "64px",
        {
          "lineHeight": "72px",
          "letterSpacing": "-0.02em",
          "fontWeight": "700"
        }
      ],
      "label-md": [
        "14px",
        {
          "lineHeight": "20px",
          "letterSpacing": "0.02em",
          "fontWeight": "500"
        }
      ],
      "label-sm": [
        "12px",
        {
          "lineHeight": "16px",
          "letterSpacing": "0.05em",
          "fontWeight": "600"
        }
      ],
      "display-lg-mobile": [
        "40px",
        {
          "lineHeight": "48px",
          "letterSpacing": "-0.02em",
          "fontWeight": "700"
        }
      ],
      "headline-lg": [
        "32px",
        {
          "lineHeight": "40px",
          "letterSpacing": "-0.01em",
          "fontWeight": "600"
        }
      ],
      "headline-md": [
        "24px",
        {
          "lineHeight": "32px",
          "letterSpacing": "-0.01em",
          "fontWeight": "600"
        }
      ],
      "body-md": [
        "16px",
        {
          "lineHeight": "24px",
          "letterSpacing": "0",
          "fontWeight": "400"
        }
      ]
    }
  } },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
