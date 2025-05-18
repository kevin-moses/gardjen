export const barnsley = {
    axiom: "-X",
    rules: {
        "F": "FF",
        "X": "F+[[X]-X]-F[-FX]+X)",
    },
    angle: 25
}

export const weed = {
    axiom: "F",
    rules: {
        "F": "FF-[XY]+[XY]",
        "X": "+FY",
        "Y": "-FX"
    },
    angle: 40
}

export const maple = {
    axiom: "A",
    rules: {
        "A": "F[+AL][-AR]",
        "L": "F[+AL][-AR]",
        "R": "F[+AL][-AR]",
        "F": "FF"
    },
    angle: 35
}
export const simpleDaisy = {
  axiom: "X",
  rules: {
    "X": "F[-X][+X]FZ",
    "F": "FF",
    "Z": "Z"  // Flower symbol
  },
  angle: 25
};
