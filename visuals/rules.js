export const barnsley = {
    axiom: "-X",
    rules: {
        "F": "FF",
        "X": "F+[[X]-X]-F[-FX]+X)",
    },
    angle: 25,
    branchColor: {
        red: 59/255,
        green: 45/255,
        blue: 34/255
    }
}

export const weed = {
    axiom: "F",
    rules: {
        "F": "FF-[XY]+[XY]",
        "X": "+FY",
        "Y": "-FX"
    },
    angle: 22.5,
    branchColor: {
        red: 82/255,
        green: 69/255,
        blue: 49/255
    }
}

export const maple = {
    // L-system rules
    axiom: "A",
    rules: {
        "A": "F[+AL][-AR]F[++AL][--AR]",
        "L": "F[+AL][-AR]",
        "R": "F[+AL][-AR]",
        "F": "FF"
    },
    angle: 32,
    maxIterations: 5,
    // Branch properties
    branch: {
        color: {
            red: 132/255,    // Bark brown
            green: 108/255,
            blue: 100/255
        },
        baseLength: 0.6,
        baseRadius: 0.25,
        lengthFactor: 0.78, // Maples have good tapering
        radiusFactor: 0.72  // Strong trunk-to-branch transition
    },
    // Leaf properties
    leaf: {
        length: {
            min: 1.4,
            max: 2.5
        },
        width: {
            min: 1.2,
            max: 2.2
        },
        archStrength: {
            min: 0.4,
            max: 0.8
        }
    },
    // Generation flags
    generate: {
        flowers: false,
        leaves: true
    }
}
export const simpleDaisy = {
    // L-system rules
    axiom: "X",
    rules: {
        "X": "F[+X][-X]FZ",  // Create branching structure with flowers
        "F": "FF",           // Make stems longer
        "Z": "Z"             // Keep flowers at branch ends
    },
    angle: 25,
    maxIterations: 3,
    // Branch properties
    branch: {
        color: {
            red: 109/255,    // Green stem color
            green: 128/255,
            blue: 72/255
        },
        baseLength: 0.4,     // Shorter stems for daisies
        baseRadius: 0.08,    // Thin delicate stems
        lengthFactor: 0.85,  // Moderate tapering
        radiusFactor: 0.8    // Gentle radius reduction
    },
    
    // Leaf properties (even though not generated, keeping for consistency)
    leaf: {
        length: {
            min: 0.8,
            max: 1.2
        },
        width: {
            min: 0.6,
            max: 1.0
        },
        archStrength: {
            min: 0.2,
            max: 0.5
        }
    },
    
    // Flower properties (new section for flowers)
    flower: {
        petalCount: {
            min: 13,         // More petals for classic daisy look
            max: 21
        },
        petalLength: {
            min: 1.8,        // Longer, more prominent petals
            max: 2.4
        },
        petalWidth: {
            min: 0.15,       // Much narrower petals
            max: 0.25
        },
        centerRadius: {
            min: 0.3,        // Slightly larger center
            max: 0.5
        },
        petalColor: {
            red: 0.98,       // Pure white petals
            green: 0.98,
            blue: 0.98
        },
        centerColor: {
            red: 1.0,        // Bright yellow center
            green: 0.85,
            blue: 0.1
        },
        petalCurvature: {    // New property for petal shape
            min: 0.1,
            max: 0.3
        },
        petalTaper: {        // New property for petal tapering
            min: 0.6,        // Petals get narrower toward tip
            max: 0.8
        }
    },
    generate: {
        flowers: true,
        leaves: false
    }
}

export const smallFern = {
    // L-system rules
    axiom: "X",
    rules: {
        "F": "FF",
        "X": "F-[[X]+X]+F[+FX]-X"
    },
    angle: 25,
    // Branch properties
    branch: {
        color: {
            red: 34/255,    // Dark forest green
            green: 139/255,
            blue: 34/255
        },
        baseLength: 0.4,
        baseRadius: 0.15,
        lengthFactor: 0.75, // Each branch level is 75% of parent's length
        radiusFactor: 0.65  // Each branch level is 65% of parent's radius
    },
    // Leaf properties
    leaf: {
        length: {
            min: 0.8,
            max: 2.0
        },
        width: {
            min: 0.3,
            max: 1.0
        },
        archStrength: {
            min: 0.3,
            max: 1.5
        }
    },
    // Generation flags
    generate: {
        flowers: false,
        leaves: true
    }
}

export const fern = {
    // L-system rules
    axiom: "F",
    rules: {
        "F": "FF-[-F+F+F]+[+F-F-F]"
    },
    angle: 23,

    // Branch properties
    branch: {
        color: {
            red: 66/255,
            green: 68/255, 
            blue: 11/255
        },
        baseLength: 0.5,
        baseRadius: 0.2,
        lengthFactor: 0.8, // Each branch level is 80% of parent's length
        radiusFactor: 0.7  // Each branch level is 70% of parent's radius
    },

    // Leaf properties 
    leaf: {
        length: {
            min: 0.5,
            max: 2.0
        },
        width: {
            min: 0.5,
            max: 2.0
        },
        archStrength: {
            min: 0.5,
            max: 3.0
        }
    },

    // Generation flags
    generate: {
        flowers: false,
        leaves: true
    }
}

export const bush = {
    axiom: "X",
    rules: {
        "X": "F[+X][-X]FX",
        "F": "FF"
    },
    angle: 30,
    branchColor: {
        red: 132/255,
        green: 108/255,
        blue: 100/255
    }
}

export const sunflower = {
    axiom: "F",
    rules: {
        "F": "F[+F]F[-F]FZ"
    },
    angle: 137.5,  // Golden angle for radial symmetry
    branchColor: {
        red: 77/255,
        green: 82/255,
        blue: 24/255
    },
    maxBranchLength: .2,
    maxLeafSize: 0.8,
    generateFlowers: true,
    generateLeaves: true,
}