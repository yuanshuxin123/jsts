import ItemBoundable from './ItemBoundable'
import PriorityQueue from '../../util/PriorityQueue'
import hasInterface from '../../../../../hasInterface'
import SpatialIndex from '../SpatialIndex'
import AbstractNode from './AbstractNode'
import Double from '../../../../../java/lang/Double'
import Collections from '../../../../../java/util/Collections'
import BoundablePair from './BoundablePair'
import ArrayList from '../../../../../java/util/ArrayList'
import Comparator from '../../../../../java/util/Comparator'
import Serializable from '../../../../../java/io/Serializable'
import Envelope from '../../geom/Envelope'
import Assert from '../../util/Assert'
import AbstractSTRtree from './AbstractSTRtree'
import ItemDistance from './ItemDistance'
export default class STRtree extends AbstractSTRtree {
  constructor () {
    super()
    STRtree.constructor_.apply(this, arguments)
  }

  static centreX (e) {
    return STRtree.avg(e.getMinX(), e.getMaxX())
  }

  static avg (a, b) {
    return (a + b) / 2
  }

  static getItems (kNearestNeighbors) {
    const items = new Array(kNearestNeighbors.size()).fill(null)
    let count = 0
    while (!kNearestNeighbors.isEmpty()) {
      const bp = kNearestNeighbors.poll()
      items[count] = bp.getBoundable(0).getItem()
      count++
    }
    return items
  }

  static centreY (e) {
    return STRtree.avg(e.getMinY(), e.getMaxY())
  }

  createParentBoundablesFromVerticalSlices (verticalSlices, newLevel) {
    Assert.isTrue(verticalSlices.length > 0)
    const parentBoundables = new ArrayList()
    for (let i = 0; i < verticalSlices.length; i++) {
      parentBoundables.addAll(this.createParentBoundablesFromVerticalSlice(verticalSlices[i], newLevel))
    }
    return parentBoundables
  }

  createNode (level) {
    return new STRtreeNode(level)
  }

  size () {
    if (arguments.length === 0) {
      return super.size.call(this)
    } else return super.size.apply(this, arguments)
  }

  insert () {
    if (arguments.length === 2 && (arguments[1] instanceof Object && arguments[0] instanceof Envelope)) {
      const itemEnv = arguments[0]; const item = arguments[1]
      if (itemEnv.isNull()) {
        return null
      }
      super.insert.call(this, itemEnv, item)
    } else return super.insert.apply(this, arguments)
  }

  getIntersectsOp () {
    return STRtree.intersectsOp
  }

  verticalSlices (childBoundables, sliceCount) {
    const sliceCapacity = Math.trunc(Math.ceil(childBoundables.size() / sliceCount))
    const slices = new Array(sliceCount).fill(null)
    const i = childBoundables.iterator()
    for (let j = 0; j < sliceCount; j++) {
      slices[j] = new ArrayList()
      let boundablesAddedToSlice = 0
      while (i.hasNext() && boundablesAddedToSlice < sliceCapacity) {
        const childBoundable = i.next()
        slices[j].add(childBoundable)
        boundablesAddedToSlice++
      }
    }
    return slices
  }

  query () {
    if (arguments.length === 1) {
      const searchEnv = arguments[0]
      return super.query.call(this, searchEnv)
    } else if (arguments.length === 2) {
      const searchEnv = arguments[0]; const visitor = arguments[1]
      super.query.call(this, searchEnv, visitor)
    }
  }

  getComparator () {
    return STRtree.yComparator
  }

  createParentBoundablesFromVerticalSlice (childBoundables, newLevel) {
    return super.createParentBoundables.call(this, childBoundables, newLevel)
  }

  remove () {
    if (arguments.length === 2 && (arguments[1] instanceof Object && arguments[0] instanceof Envelope)) {
      const itemEnv = arguments[0]; const item = arguments[1]
      return super.remove.call(this, itemEnv, item)
    } else return super.remove.apply(this, arguments)
  }

  depth () {
    if (arguments.length === 0) {
      return super.depth.call(this)
    } else return super.depth.apply(this, arguments)
  }

  createParentBoundables (childBoundables, newLevel) {
    Assert.isTrue(!childBoundables.isEmpty())
    const minLeafCount = Math.trunc(Math.ceil(childBoundables.size() / this.getNodeCapacity()))
    const sortedChildBoundables = new ArrayList(childBoundables)
    Collections.sort(sortedChildBoundables, STRtree.xComparator)
    const verticalSlices = this.verticalSlices(sortedChildBoundables, Math.trunc(Math.ceil(Math.sqrt(minLeafCount))))
    return this.createParentBoundablesFromVerticalSlices(verticalSlices, newLevel)
  }

  nearestNeighbour () {
    if (arguments.length === 1) {
      if (hasInterface(arguments[0], ItemDistance)) {
        const itemDist = arguments[0]
        const bp = new BoundablePair(this.getRoot(), this.getRoot(), itemDist)
        return this.nearestNeighbour(bp)
      } else if (arguments[0] instanceof BoundablePair) {
        const initBndPair = arguments[0]
        return this.nearestNeighbour(initBndPair, Double.POSITIVE_INFINITY)
      }
    } else if (arguments.length === 2) {
      if (arguments[0] instanceof STRtree && hasInterface(arguments[1], ItemDistance)) {
        const tree = arguments[0]; const itemDist = arguments[1]
        const bp = new BoundablePair(this.getRoot(), tree.getRoot(), itemDist)
        return this.nearestNeighbour(bp)
      } else if (arguments[0] instanceof BoundablePair && typeof arguments[1] === 'number') {
        const initBndPair = arguments[0]; const maxDistance = arguments[1]
        let distanceLowerBound = maxDistance
        let minPair = null
        const priQ = new PriorityQueue()
        priQ.add(initBndPair)
        while (!priQ.isEmpty() && distanceLowerBound > 0.0) {
          const bndPair = priQ.poll()
          const currentDistance = bndPair.getDistance()
          if (currentDistance >= distanceLowerBound) break
          if (bndPair.isLeaves()) {
            distanceLowerBound = currentDistance
            minPair = bndPair
          } else {
            bndPair.expandToQueue(priQ, distanceLowerBound)
          }
        }
        return [minPair.getBoundable(0).getItem(), minPair.getBoundable(1).getItem()]
      } else if (arguments[0] instanceof BoundablePair && Number.isInteger(arguments[1])) {
        const initBndPair = arguments[0]; const k = arguments[1]
        return this.nearestNeighbour(initBndPair, Double.POSITIVE_INFINITY, k)
      }
    } else if (arguments.length === 3) {
      if (hasInterface(arguments[2], ItemDistance) && (arguments[0] instanceof Envelope && arguments[1] instanceof Object)) {
        const env = arguments[0]; const item = arguments[1]; const itemDist = arguments[2]
        const bnd = new ItemBoundable(env, item)
        const bp = new BoundablePair(this.getRoot(), bnd, itemDist)
        return this.nearestNeighbour(bp)[0]
      } else if (Number.isInteger(arguments[2]) && (arguments[0] instanceof BoundablePair && typeof arguments[1] === 'number')) {
        const initBndPair = arguments[0]; const maxDistance = arguments[1]; const k = arguments[2]
        let distanceLowerBound = maxDistance
        const priQ = new PriorityQueue()
        priQ.add(initBndPair)
        const kNearestNeighbors = new PriorityQueue()
        while (!priQ.isEmpty() && distanceLowerBound >= 0.0) {
          const bndPair = priQ.poll()
          const currentDistance = bndPair.getDistance()
          if (currentDistance >= distanceLowerBound) {
            break
          }
          if (bndPair.isLeaves()) {
            if (kNearestNeighbors.size() < k) {
              kNearestNeighbors.add(bndPair)
            } else {
              const bp1 = kNearestNeighbors.peek()
              if (bp1.getDistance() > currentDistance) {
                kNearestNeighbors.poll()
                kNearestNeighbors.add(bndPair)
              }
              const bp2 = kNearestNeighbors.peek()
              distanceLowerBound = bp2.getDistance()
            }
          } else {
            bndPair.expandToQueue(priQ, distanceLowerBound)
          }
        }
        return STRtree.getItems(kNearestNeighbors)
      }
    } else if (arguments.length === 4) {
      const env = arguments[0]; const item = arguments[1]; const itemDist = arguments[2]; const k = arguments[3]
      const bnd = new ItemBoundable(env, item)
      const bp = new BoundablePair(this.getRoot(), bnd, itemDist)
      return this.nearestNeighbour(bp, k)
    }
  }

  getClass () {
    return STRtree
  }

  get interfaces_ () {
    return [SpatialIndex, Serializable]
  }
}
class STRtreeNode extends AbstractNode {
  constructor () {
    super()
    STRtreeNode.constructor_.apply(this, arguments)
  }

  computeBounds () {
    let bounds = null
    for (let i = this.getChildBoundables().iterator(); i.hasNext();) {
      const childBoundable = i.next()
      if (bounds === null) {
        bounds = new Envelope(childBoundable.getBounds())
      } else {
        bounds.expandToInclude(childBoundable.getBounds())
      }
    }
    return bounds
  }

  getClass () {
    return STRtreeNode
  }

  get interfaces_ () {
    return []
  }
}
STRtreeNode.constructor_ = function () {
  const level = arguments[0]
  AbstractNode.constructor_.call(this, level)
}
STRtree.STRtreeNode = STRtreeNode
STRtree.constructor_ = function () {
  if (arguments.length === 0) {
    STRtree.constructor_.call(this, STRtree.DEFAULT_NODE_CAPACITY)
  } else if (arguments.length === 1) {
    const nodeCapacity = arguments[0]
    AbstractSTRtree.constructor_.call(this, nodeCapacity)
  }
}
STRtree.serialVersionUID = 259274702368956900
STRtree.xComparator = new (class {
  get interfaces_ () {
    return [Comparator]
  }

  compare (o1, o2) {
    return AbstractSTRtree.compareDoubles(STRtree.centreX(o1.getBounds()), STRtree.centreX(o2.getBounds()))
  }
})()
STRtree.yComparator = new (class {
  get interfaces_ () {
    return [Comparator]
  }

  compare (o1, o2) {
    return AbstractSTRtree.compareDoubles(STRtree.centreY(o1.getBounds()), STRtree.centreY(o2.getBounds()))
  }
})()
STRtree.intersectsOp = new (class {
  get interfaces_ () {
    return [IntersectsOp]
  }

  intersects (aBounds, bBounds) {
    return aBounds.intersects(bBounds)
  }
})()
STRtree.DEFAULT_NODE_CAPACITY = 10
