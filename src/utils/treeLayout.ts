import { quadBezierPoint, scaledBezier } from '../constants/tubaTree';
import { TreeData } from '../types/tubaTree';

export interface TreeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const TREE_STAGE_SAFE_BOX = {
  seedling: { left: 28, right: 292, top: 84, bottom: 254, maxScale: 3.32 },
  sapling: { left: 18, right: 302, top: 58, bottom: 260, maxScale: 2.62 },
  growing: { left: 12, right: 308, top: 16, bottom: 276, maxScale: 1.16 },
  flourishing: { left: 16, right: 304, top: 20, bottom: 275, maxScale: 1.0 },
  ancient: { left: 16, right: 304, top: 18, bottom: 275, maxScale: 0.98 },
} as const;

function expandBounds(bounds: TreeBounds, x: number, y: number, padding: number): TreeBounds {
  return {
    minX: Math.min(bounds.minX, x - padding),
    maxX: Math.max(bounds.maxX, x + padding),
    minY: Math.min(bounds.minY, y - padding),
    maxY: Math.max(bounds.maxY, y + padding),
  };
}

function measureCurveBounds(
  bounds: TreeBounds,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  padding: number,
): TreeBounds {
  let next = bounds;
  for (let step = 0; step <= 10; step += 1) {
    const point = quadBezierPoint(start, control, end, step / 10);
    next = expandBounds(next, point.x, point.y, padding);
  }
  return next;
}

export function measureTreeBounds(treeData: TreeData): TreeBounds {
  let bounds: TreeBounds = {
    minX: treeData.trunkCurve.start.x,
    maxX: treeData.trunkCurve.start.x,
    minY: treeData.trunkCurve.start.y,
    maxY: treeData.trunkCurve.start.y,
  };

  bounds = measureCurveBounds(
    bounds,
    treeData.trunkCurve.start,
    treeData.trunkCurve.control,
    treeData.trunkCurve.end,
    treeData.trunkWidth * 0.58 + 3,
  );

  treeData.branches.forEach((branch) => {
    const renderedBranch = scaledBezier(
      branch.curve.start,
      branch.curve.control,
      branch.curve.end,
      branch.lengthScale,
    );
    bounds = measureCurveBounds(
      bounds,
      branch.curve.start,
      renderedBranch.control,
      renderedBranch.end,
      branch.strokeWidth * 0.8 + 4,
    );

    branch.leaves.forEach((leaf) => {
      const leafPad = leaf.renderKind === 'bud'
        ? 5
        : leaf.renderKind === 'paired'
          ? 7
          : leaf.renderKind === 'cotyledon'
            ? 8
            : 10;
      bounds = expandBounds(bounds, leaf.x, leaf.y, leafPad);
    });

    branch.subBranches.forEach((subBranch) => {
      bounds = measureCurveBounds(
        bounds,
        subBranch.curve.start,
        subBranch.curve.control,
        subBranch.curve.end,
        subBranch.strokeWidth * 0.8 + 4,
      );

      subBranch.leaves.forEach((leaf) => {
        bounds = expandBounds(bounds, leaf.x, leaf.y, 8);
      });
    });
  });

  return bounds;
}

export function transformBounds(
  bounds: TreeBounds,
  scale: number,
  translateX: number,
  translateY: number,
): TreeBounds {
  return {
    minX: bounds.minX * scale + translateX,
    maxX: bounds.maxX * scale + translateX,
    minY: bounds.minY * scale + translateY,
    maxY: bounds.maxY * scale + translateY,
  };
}

export function getTreeStageTransform(treeData: TreeData) {
  const safeBox = TREE_STAGE_SAFE_BOX[treeData.stage];
  const rawBounds = measureTreeBounds(treeData);
  const rawWidth = Math.max(1, rawBounds.maxX - rawBounds.minX);
  const rawHeight = Math.max(1, rawBounds.maxY - rawBounds.minY);
  const safeWidth = safeBox.right - safeBox.left;
  const safeHeight = safeBox.bottom - safeBox.top;
  const fitScale = Math.min(safeWidth / rawWidth, safeHeight / rawHeight);
  const scale = Math.min(safeBox.maxScale, fitScale);
  const centerX = (rawBounds.minX + rawBounds.maxX) / 2;
  const translateX = (safeBox.left + safeBox.right) / 2 - centerX * scale;
  const translateY = safeBox.bottom - rawBounds.maxY * scale;

  return {
    scale,
    translateX,
    translateY,
    safeBox,
    rawBounds,
    svgTransform: `translate(${translateX.toFixed(2)} ${translateY.toFixed(2)}) scale(${scale.toFixed(4)})`,
  };
}
