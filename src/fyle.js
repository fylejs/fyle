export function square(x) {
  return Math.pow(Number(x), 2);
}

export function cube(x) {
  return Math.pow(x, 3);
}

var fyle = () => {
  console.log("test");
};

export default fyle;

export class test {
  constructor() {
    fyle();
  }
}
