'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { KEY_POSITIONS, APPROACH_OFFSET } from '@/lib/config/keyConfig';

const KEY_SIZE = 0.025;
const ROW1_COLOR = 0x44aa88;
const ROW2_COLOR = 0x88aa44;

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = 'Bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.06, 0.06, 1);
  return sprite;
}

export function createKeyPanel(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'key-panel';

  KEY_POSITIONS.forEach((pos, i) => {
    const color = i < 3 ? ROW1_COLOR : ROW2_COLOR;
    const geo = new THREE.BoxGeometry(KEY_SIZE, KEY_SIZE, KEY_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.castShadow = true;
    mesh.name = `key-${i + 1}`;
    group.add(mesh);

    const sprite = makeTextSprite(`${i + 1}`);
    sprite.position.set(pos.x, pos.y, pos.z + KEY_SIZE + 0.01);
    group.add(sprite);
  });

  scene.add(group);
  return group;
}
