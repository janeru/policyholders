import { pool } from "../../db/connect.js";
import { createCustomError } from "../../errors/customErrors.js";
import { tryCatchWrapper } from "../../middlewares/tryCatchWrapper.js";

const dbTable = 'POLICYHOLDERS'

// Function to perform a query
async function queryDatabase(query, values) {
    try {
      const [policyHolders] = await pool.query(query, values);
      return policyHolders;
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  }
  
/**
 * @returns policyholders data
 */
async function getPolicyholders() {
    const query = 'SELECT * FROM ??';  // Use ?? as a placeholder for table names
    const values = [dbTable];  // dbTable should be the name of your table
    const policyHolders = await queryDatabase(query,values);
    return policyHolders
  }
  

/**
 * @description Get Single policyholders
 * @route GET /policyholders?code=123
 */

async function buildTree(clients, rootCode) {
    const clientMap = new Map();

    // 初始化所有保戶
    clients.forEach(client => {
        client.left = null;
        client.right = null;
        clientMap.set(client.code, client);
    });

    // 拿取直接介绍的保户
    const getDirectChildren = (parentCode) => {
        return clients.filter(client => client.introducer_code === parentCode);
    };

    // 算子樹node數量
    const countNodes = (node) => {
        if (!node) return 0;
        return 1 + countNodes(node.left) + countNodes(node.right);
    };

    // 插入node到二元樹
    const insertNodeAtCorrectPlace = (parent, child) => {
        const leftCount = countNodes(parent.left);
        const rightCount = countNodes(parent.right);

        if (!parent.left || leftCount <= rightCount) {
            if (!parent.left) {
                parent.left = child;
            } else {
                insertNodeAtCorrectPlace(parent.left, child);
            }
        } else {
            if (!parent.right) {
                parent.right = child;
            } else {
                insertNodeAtCorrectPlace(parent.right, child);
            }
        }
    };

    // build tree
    const buildNode = (node) => {
        const children = getDirectChildren(node.code);
        // 照registration_date排序
        children.sort((a, b) => new Date(a.registration_date) - new Date(b.registration_date));

        children.forEach(child => {
            // 確定node插入到樹中
            insertNodeAtCorrectPlace(node, clientMap.get(child.code));
            // 遞迴建立子樹
            buildNode(clientMap.get(child.code));
        });
        return node;
    };

    const root = clientMap.get(rootCode);
    if (!root) return null;

    return buildNode(root);
}



export const getSinglePolicyholder = tryCatchWrapper(async function (req, res, next) {
    const  { code: policyholderCode}  = req.query;
    const clients = await getPolicyholders()
    const client = clients.find(c => c.code === policyholderCode);

    if (!client) return next(createCustomError("Client not found", 404));

    const result = await buildTree(clients, policyholderCode);
    return res.status(200).json(result);
  });
  
  function getParentHierarchy(treeRoot, targetCode) {
    // 查找目標保户node
    const findTargetNode = (node, targetCode) => {
        if (!node) return null;
        if (node.code === targetCode) return node;
        return findTargetNode(node.left, targetCode) || findTargetNode(node.right, targetCode);
    };

    // 查找目標保户的父node
    const findParent = (node, targetCode) => {
        if (!node) return null;
        if ((node.left && node.left.code === targetCode) || (node.right && node.right.code === targetCode)) {
            return node;
        }
        return findParent(node.left, targetCode) || findParent(node.right, targetCode);
    };

    // 拿取目標保户node
    const targetNode = findTargetNode(treeRoot, targetCode);
    if (!targetNode) return null;

    // 拿取目標保户的父node
    const parentNode = findParent(treeRoot, targetCode);

    if (!parentNode) return null;

    // 组合结果，只保留目標保户和其父node
    const result = {
        ...parentNode,
        left: parentNode.left && parentNode.left.code === targetCode ? {
            ...targetNode,
            left: null,
            right: null
        } : null,
        right: parentNode.right && parentNode.right.code === targetCode ? {
            ...targetNode,
            left: null,
            right: null
        } : null
    };

    return result;
}


  export const getTopPolicyholder = tryCatchWrapper(async function (req, res, next) {
    const  { code: policyholderCode}  = req.params;
    const clients = await getPolicyholders()
    const client = clients.find(c => c.code === policyholderCode);

    if (!client) return next(createCustomError("Client not found", 404));

    // 使用buildTree後，使用buildTopHierarchy查找特定保户的上層
const treeRoot = await buildTree(clients, "P001"); // 以P001是root node
const topHierarchy = await getParentHierarchy(treeRoot, policyholderCode); // 查找P021的上层层级关系
    return res.status(200).json(topHierarchy);
  });