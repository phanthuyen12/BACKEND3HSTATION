const ApiError = require('../../utils/apiError');
const workflowModel = require('../../models/workflows/workflowModel');
const categoryModel = require('../../models/workflows/categoryModel');
const { buildPagination } = require('../../utils/pagination');

const listWorkflows = async ({ page = 1, limit = 20, search, category }) => {
  const { offset, limit: queryLimit } = buildPagination(page, limit);
  
  const categoryId = category ? parseInt(category) : null;
  const workflows = await workflowModel.listWorkflows({
    categoryId,
    search,
    limit: queryLimit,
    offset
  });

  const total = await workflowModel.countWorkflows({ categoryId, search });
  const totalPages = Math.ceil(total / queryLimit);

  return {
    data: workflows,
    pagination: {
      page,
      limit: queryLimit,
      total,
      totalPages
    }
  };
};

const getWorkflowById = async (id) => {
  const workflow = await workflowModel.getWorkflowById(id);
  if (!workflow) {
    throw ApiError.notFound('Workflow not found');
  }
  return workflow;
};

const createWorkflow = async (data) => {
  // Validate category exists
  const category = await categoryModel.getCategoryById(data.categoryId);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  const workflow = await workflowModel.createWorkflow({
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    image: data.image,
    price: data.price,
    tags: data.tags,
    content: data.content,
    status: data.status || 'active'
  });

  return workflow;
};

const updateWorkflow = async (id, data) => {
  const existing = await workflowModel.getWorkflowById(id);
  if (!existing) {
    throw ApiError.notFound('Workflow not found');
  }

  // If categoryId is being updated, validate it exists
  if (data.categoryId) {
    const category = await categoryModel.getCategoryById(data.categoryId);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
  }

  const workflow = await workflowModel.updateWorkflow(id, data);
  return workflow;
};

const deleteWorkflow = async (id) => {
  const existing = await workflowModel.getWorkflowById(id);
  if (!existing) {
    throw ApiError.notFound('Workflow not found');
  }

  await workflowModel.deleteWorkflow(id);
};

const getStats = async () => {
  const totalWorkflows = await workflowModel.countWorkflows({});
  const totalCategories = await categoryModel.countCategories();

  return {
    totalWorkflows,
    totalCategories
  };
};

module.exports = {
  listWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getStats
};



