const FIXTURE_PROFILES = {
    // 1. BO1940
    "bo1940_23": {
        name: "BO1940 (23-CH Mode)",
        channelCount: 23,
        dimmerChannel: 8,
        groups: [
            {
                name: "Position (位置)",
                sliders: [
                    { ch: 1, label: "Pan", default: 128 },
                    { ch: 2, label: "Pan Fine", default: 0 },
                    { ch: 3, label: "Tilt", default: 128 },
                    { ch: 4, label: "Tilt Fine", default: 0 },
                    { ch: 5, label: "P/T Speed", default: 0 }
                ]
            },
            {
                name: "Master & Zoom (主控/變焦)",
                sliders: [
                    { ch: 6, label: "Zoom(調焦)", default: 0 },
                    { ch: 8, label: "Dimmer", default: 255 },
                    { ch: 9, label: "Strobe", default: 0 },
                    { ch: 7, label: "Lens Rot.", default: 0 }
                ]
            },
            {
                name: "Foreground RGBW",
                isColor: true,
                sliders: [
                    { ch: 10, label: "Red", cssClass: "c-red", default: 0 },
                    { ch: 11, label: "Green", cssClass: "c-green", default: 0 },
                    { ch: 12, label: "Blue", cssClass: "c-blue", default: 0 },
                    { ch: 13, label: "White", cssClass: "c-white", default: 0 },
                    { ch: 14, label: "CTO", default: 0 }
                ]
            },
            {
                name: "Background RGBW",
                isColor: true,
                sliders: [
                    { ch: 19, label: "BG Red", cssClass: "c-red", default: 0 },
                    { ch: 20, label: "BG Green", cssClass: "c-green", default: 0 },
                    { ch: 21, label: "BG Blue", cssClass: "c-blue", default: 0 },
                    { ch: 22, label: "BG White", cssClass: "c-white", default: 0 }
                ]
            },
            {
                name: "Macro & Reset",
                sliders: [
                    { ch: 15, label: "Color Mac.", default: 0 },
                    { ch: 16, label: "Static Pat.", default: 0 },
                    { ch: 17, label: "Dyn. Pat.", default: 0 },
                    { ch: 18, label: "Pat. Speed", default: 128 }
                ]
            }
        ],
        macros: [
            { label: "全亮(白)", action: "custom", handler: (setCh) => { setCh(8, 255); setCh(10, 255); setCh(11, 255); setCh(12, 255); setCh(13, 255); } },
            { label: "全暗(亮度0)", action: "custom", handler: (setCh) => { setCh(8, 0); } },
            { label: "P/T 置中", action: "custom", handler: (setCh) => { setCh(1, 128); setCh(3, 128); } },
            { label: "RESET (255)", action: "reset", ch: 23, val: 255, duration: 5500, style: "danger" }
        ]
    },

    // 2. ETC Lustr 2 Direct Mode
    "lustr2_direct": {
        name: "ETC Lustr 2 (Direct Mode - 10CH)",
        channelCount: 10,
        dimmerChannel: 8,
        groups: [
            {
                name: "Master Intensity",
                sliders: [
                    { ch: 8, label: "Intensity", default: 255 },
                    { ch: 9, label: "Strobe", default: 0 },
                    { ch: 10, label: "Fan", default: 128 }
                ]
            },
            {
                name: "Direct Color",
                isColor: true,
                sliders: [
                    { ch: 1, label: "Red", cssClass: "c-red", default: 0 },
                    { ch: 2, label: "Lime", cssClass: "c-green", default: 0 },
                    { ch: 3, label: "Amber", cssClass: "c-white", default: 0 },
                    { ch: 4, label: "Green", cssClass: "c-green", default: 0 },
                    { ch: 5, label: "Cyan", cssClass: "c-blue", default: 0 },
                    { ch: 6, label: "Blue", cssClass: "c-blue", default: 0 },
                    { ch: 7, label: "Indigo", cssClass: "c-blue", default: 0 }
                ]
            }
        ],
        macros: [
            { label: "全亮(所有顏色)", action: "custom", handler: (setCh) => { setCh(8,255); [1,2,3,4,5,6,7].forEach(c => setCh(c,255)); } },
            { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(8,0); } }
        ]
    },

    // 3. EclProfile CT+ Extended
    "eclprofile_ext": {
        name: "EclProfile CT+ (Extended)",
        channelCount: 17, // Using basic 11 extracted, total usually 17
        dimmerChannel: 1,
        groups: [
            {
                name: "Master",
                sliders: [
                    { ch: 1, label: "Dimmer", default: 255 },
                    { ch: 2, label: "Dim Fine", default: 0 },
                    { ch: 3, label: "Strobe", default: 0 }
                ]
            },
            {
                name: "Color Control",
                sliders: [
                    { ch: 4, label: "CCT", default: 0 },
                    { ch: 5, label: "Tint", default: 128 },
                    { ch: 10, label: "Saturation", default: 0 },
                    { ch: 11, label: "CTO", default: 0 }
                ]
            },
            {
                name: "Color Mix",
                isColor: true,
                sliders: [
                    { ch: 6, label: "Mix 1", cssClass: "c-red", default: 0 },
                    { ch: 7, label: "Mix 2", cssClass: "c-green", default: 0 },
                    { ch: 8, label: "Mix 3", cssClass: "c-blue", default: 0 }
                ]
            }
        ],
        macros: [
            { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(1,0); } }
        ]
    },

    // 4. Robe T11 Profile 28 Ch
    "robe_t11_28": {
        name: "Robe T11 Profile (28 Ch)",
        channelCount: 28,
        dimmerChannel: 27, 
        groups: [
            {
                name: "Master",
                sliders: [
                    { ch: 27, label: "Dimmer", default: 255 },
                    { ch: 28, label: "Dim Fine", default: 0 },
                    { ch: 26, label: "Strobe", default: 0 }
                ]
            },
            {
                name: "Color Mix",
                isColor: true,
                sliders: [
                    { ch: 6, label: "CTO", default: 0 },
                    { ch: 8, label: "Red", cssClass: "c-red", default: 0 },
                    { ch: 9, label: "Green", cssClass: "c-green", default: 0 },
                    { ch: 10, label: "Blue", cssClass: "c-blue", default: 0 },
                    { ch: 11, label: "Amber", cssClass: "c-white", default: 0 },
                    { ch: 12, label: "Cyan", cssClass: "c-blue", default: 0 }
                ]
            },
            {
                name: "Optics & Gobo",
                sliders: [
                    { ch: 13, label: "Zoom", default: 128 },
                    { ch: 14, label: "Focus", default: 128 },
                    { ch: 15, label: "Frost", default: 0 },
                    { ch: 16, label: "Gobo", default: 0 },
                    { ch: 17, label: "Iris", default: 255 }
                ]
            },
            {
                name: "Framing System",
                sliders: [
                    { ch: 18, label: "Blade 1A", default: 0 },
                    { ch: 19, label: "Blade 1B", default: 0 },
                    { ch: 20, label: "Blade 2A", default: 0 },
                    { ch: 21, label: "Blade 2B", default: 0 },
                    { ch: 22, label: "Blade 3A", default: 0 },
                    { ch: 23, label: "Blade 3B", default: 0 },
                    { ch: 24, label: "Blade 4A", default: 0 },
                    { ch: 25, label: "Blade 4B", default: 0 }
                ]
            }
        ],
        macros: [
            { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(27,0); } },
            { label: "白光", action: "custom", handler: (setCh) => { setCh(8,255); setCh(9,255); setCh(10,255); setCh(11,255); setCh(12,255); } }
        ]
    },

    // 5. Robe T11 Profile 22 Ch
    "robe_t11_22": {
        name: "Robe T11 Profile (22 Ch)",
        channelCount: 22,
        dimmerChannel: 21,
        groups: [
            {
                name: "Master",
                sliders: [
                    { ch: 21, label: "Dimmer", default: 255 },
                    { ch: 22, label: "Dim Fine", default: 0 },
                    { ch: 20, label: "Strobe", default: 0 }
                ]
            },
            {
                name: "Color Mix",
                isColor: true,
                sliders: [
                    { ch: 6, label: "CTO", default: 0 },
                    { ch: 7, label: "Red", cssClass: "c-red", default: 0 },
                    { ch: 8, label: "Green", cssClass: "c-green", default: 0 },
                    { ch: 9, label: "Blue", cssClass: "c-blue", default: 0 }
                ]
            },
            {
                name: "Profile Features",
                sliders: [
                    { ch: 11, label: "Zoom", default: 128 },
                    { ch: 12, label: "Focus", default: 128 },
                    { ch: 13, label: "Gobo", default: 0 },
                    { ch: 14, label: "Frost", default: 0 }
                ]
            }
        ],
        macros: [
            { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(21,0); } }
        ]
    },

    // 6. CKC ZB 19x Standard
    "ckc_zb19x_std": {
        name: "CKC ZB 19x (Extend Mode - 21CH)",
        channelCount: 21, 
        dimmerChannel: 6,
        groups: [
            {
                name: "Position",
                sliders: [
                    { ch: 1, label: "Pan", default: 128 },
                    { ch: 2, label: "Pan Fine", default: 0 },
                    { ch: 3, label: "Tilt", default: 128 },
                    { ch: 4, label: "Tilt Fine", default: 0 },
                    { ch: 5, label: "P/T Speed", default: 0 }
                ]
            },
            {
                name: "Master",
                sliders: [
                    { ch: 6, label: "Dimmer", default: 255 },
                    { ch: 7, label: "Dim Fine", default: 0 },
                    { ch: 8, label: "Strobe", default: 0 } 
                ]
            },
            {
                name: "Colors",
                isColor: true,
                sliders: [
                    { ch: 9, label: "Red", cssClass: "c-red", default: 0 },
                    { ch: 10, label: "Green", cssClass: "c-green", default: 0 },
                    { ch: 11, label: "Blue", cssClass: "c-blue", default: 0 },
                    { ch: 12, label: "White", cssClass: "c-white", default: 0 }
                ]
            },
            {
                name: "Macros (Virtual Colors & Prog)",
                sliders: [
                    { ch: 13, label: "Vir Color Fg", default: 0 },
                    { ch: 14, label: "Vir Color Bg", default: 0 },
                    { ch: 15, label: "Pattern Prog", default: 0 },
                    { ch: 16, label: "Prog Speed", default: 128 }
                ]
            }
        ],
        macros: [
            { label: "P/T 置中", action: "custom", handler: (setCh) => { setCh(1,128); setCh(3,128); } },
            { label: "全亮(白)", action: "custom", handler: (setCh) => { setCh(6,255); setCh(9,255); setCh(10,255); setCh(11,255); setCh(12,255); } },
            { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(6,0); } }
        ]
    },

    // 7. Acme AECO 15 Framing
    "acme_aeco15": {
        name: "Acme AECO 15 (Framing Mode - 38CH)",
        channelCount: 38,
        dimmerChannel: 27, 
        groups: [
            {
                name: "Position",
                sliders: [
                    { ch: 1, label: "Pan", default: 128 },
                    { ch: 2, label: "Pan Fine", default: 0 },
                    { ch: 3, label: "Tilt", default: 128 },
                    { ch: 4, label: "Tilt Fine", default: 0 },
                    { ch: 5, label: "P/T Speed", default: 0 }
                ]
            },
            {
                name: "Master",
                sliders: [
                    { ch: 26, label: "Strobe", default: 0 },
                    { ch: 27, label: "Dimmer", default: 255 },
                    { ch: 28, label: "Dim Fine", default: 0 }
                ]
            },
            {
                name: "Color Mix (CMY/CTO)",
                isColor: true,
                sliders: [
                    { ch: 6, label: "Hue", default: 0 },
                    { ch: 7, label: "Cyan", cssClass: "c-blue", default: 0 },
                    { ch: 8, label: "Magenta", cssClass: "c-red", default: 0 },
                    { ch: 9, label: "Yellow", cssClass: "c-green", default: 0 },
                    { ch: 10, label: "CTO", default: 0 },
                    { ch: 11, label: "Color Whl", default: 0 }
                ]
            },
            {
                name: "Gobo & Optics",
                sliders: [
                    { ch: 12, label: "Gobo 1", default: 0 },
                    { ch: 13, label: "R-Gobo 1", default: 0 },
                    { ch: 15, label: "Gobo 2", default: 0 },
                    { ch: 16, label: "Zoom", default: 128 },
                    { ch: 17, label: "Focus", default: 128 },
                    { ch: 18, label: "Iris", default: 255 },
                    { ch: 19, label: "Prism", default: 0 },
                    { ch: 20, label: "Prism Rot", default: 0 },
                    { ch: 21, label: "Frost 1", default: 0 },
                    { ch: 22, label: "Frost 2", default: 0 }
                ]
            },
            {
                name: "Framing System",
                sliders: [
                    { ch: 29, label: "Frame Rot.", default: 128 },
                    { ch: 30, label: "Blade 1 DW", default: 0 },
                    { ch: 31, label: "Blade 1 UP", default: 0 },
                    { ch: 32, label: "Blade 2 DW", default: 0 },
                    { ch: 33, label: "Blade 2 UP", default: 0 },
                    { ch: 34, label: "Blade 3 LF", default: 0 },
                    { ch: 35, label: "Blade 3 RG", default: 0 },
                    { ch: 36, label: "Blade 4 LF", default: 0 },
                    { ch: 37, label: "Blade 4 RG", default: 0 }
                ]
            }
        ],
        macros: [
            { label: "P/T 置中", action: "custom", handler: (setCh) => { setCh(1,128); setCh(3,128); } },
            { label: "白光", action: "custom", handler: (setCh) => { setCh(6,0); setCh(7,0); setCh(8,0); setCh(9,0); } },
            { label: "Frame 復位", action: "custom", handler: (setCh) => { for(let i=30; i<=37; i++) setCh(i,0); setCh(29,128); } },
            { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(27,0); } }
        ]
    },

    // 8. ACME XA 500 Mode 1
    "acme_xa500": {
        name: "ACME XA 500 BSW (Mode 1 - 29CH)",
        channelCount: 29,
        dimmerChannel: 18,
        groups: [
            {
                name: "Position",
                sliders: [
                    { ch: 1, label: "Pan", default: 128 },
                    { ch: 2, label: "Tilt", default: 128 },
                    { ch: 3, label: "P/T Speed", default: 0 }
                ]
            },
            {
                name: "Master",
                sliders: [
                    { ch: 17, label: "Strobe", default: 12 },
                    { ch: 18, label: "Dimmer", default: 255 },
                    { ch: 19, label: "Dim Fine", default: 0 }
                ]
            },
            {
                name: "CMY & Color",
                isColor: true,
                sliders: [
                    { ch: 4, label: "Cyan", cssClass: "c-blue", default: 0 },
                    { ch: 5, label: "Magenta", cssClass: "c-red", default: 0 },
                    { ch: 6, label: "Yellow", cssClass: "c-green", default: 0 },
                    { ch: 7, label: "CTO", default: 0 },
                    { ch: 8, label: "Color", default: 0 }
                ]
            },
            {
                name: "BSW Features",
                sliders: [
                    { ch: 9, label: "Gobo 1", default: 0 },
                    { ch: 10, label: "R-Gobo 1", default: 0 },
                    { ch: 11, label: "Gobo 2", default: 0 },
                    { ch: 12, label: "Iris", default: 255 },
                    { ch: 13, label: "Prism", default: 0 },
                    { ch: 14, label: "R-Prism", default: 0 },
                    { ch: 15, label: "Zoom", default: 128 },
                    { ch: 16, label: "Focus", default: 128 }
                ]
            },
            {
                name: "Framing System",
                sliders: [
                    { ch: 20, label: "Frame Rot.", default: 128 },
                    { ch: 21, label: "Frame 1", default: 0 },
                    { ch: 22, label: "Frame 2", default: 0 },
                    { ch: 23, label: "Frame 3", default: 0 },
                    { ch: 24, label: "Frame 4", default: 0 },
                    { ch: 25, label: "Frame 5", default: 0 },
                    { ch: 26, label: "Frame 6", default: 0 },
                    { ch: 27, label: "Frame 7", default: 0 },
                    { ch: 28, label: "Frame 8", default: 0 }
                ]
            }
        ],
        macros: [
             { label: "P/T 置中", action: "custom", handler: (setCh) => { setCh(1,128); setCh(3,128); } },
             { label: "全白光", action: "custom", handler: (setCh) => { setCh(6,0); setCh(7,0); setCh(8,0); } },
             { label: "全暗(Blackout)", action: "custom", handler: (setCh) => { setCh(18,0); } }
        ]
    }
};
