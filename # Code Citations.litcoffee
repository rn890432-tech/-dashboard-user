# Code Citations

## License: MIT

<https://github.com/ArtiomTr/mooncake/tree/9325cf2b7686388c15a050adabdf81eb6fd48abe/src/components/MoonScene.tsx>

```
) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos
```

## License: unknown

<https://github.com/thillmann/three-globe/tree/b637cab9a0416d36ddeab82302aaae45f6cbacc6/src/utils/coordinates.ts>

```
lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius *
```

## License: MIT

<https://github.com/mouradski/xrapid_alert/tree/ae3f5261183a44c0b24a33a98ab14672dedd8039/src/main/webapp-vue/src/components/charts/Globe.vue>

```
180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math
```

## License: unknown

<https://github.com/mpaccione/usgs-viz-2021/tree/3ec7dd9e320eb97fc06977326cedeb095dae89cc/server/src/helpers/three.mjs>

```
.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y,
```

## License: unknown

<https://github.com/mpaccione/usgs-viz-2021/tree/3ec7dd9e320eb97fc06977326cedeb095dae89cc/client/src/helpers/dataVizAnimation.js>

```
phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
```
