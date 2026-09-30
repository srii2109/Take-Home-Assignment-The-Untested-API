const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');


describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('should pass validation with valid required fields', () => {
      const result = validateCreateTask({ title: 'Buy groceries' });
      expect(result).toBeNull();
    });

    test('should pass validation with all valid fields', () => {
      const result = validateCreateTask({
        title: 'Complete homework',
        description: 'Math exercises',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });
      expect(result).toBeNull();
    });

    test('should accept all valid statuses (todo, in_progress, done)', () => {
      expect(validateCreateTask({ title: 'Task 1', status: 'todo' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 2', status: 'in_progress' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 3', status: 'done' })).toBeNull();
    });

    test('should accept all valid priorities (low, medium, high)', () => {
      expect(validateCreateTask({ title: 'Task 1', priority: 'low' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 2', priority: 'medium' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 3', priority: 'high' })).toBeNull();
    });

    test('should fail when title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should fail when title is an empty string or whitespace only', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    test('should fail when title is not a string', () => {
      expect(validateCreateTask({ title: 12345 })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: null })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: true })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: {} })).toBe('title is required and must be a non-empty string');
    });

    test('should fail when status is invalid', () => {
      const result = validateCreateTask({ title: 'Task', status: 'pending' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('should fail when priority is invalid', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('should fail when dueDate is not a valid ISO date string', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'invalid-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });

    test('should handle null or non-object body without throwing an uncaught exception', () => {
      expect(() => validateCreateTask(null)).not.toThrow();
      expect(() => validateCreateTask(undefined)).not.toThrow();
    });
  });

  describe('validateUpdateTask', () => {
    test('should pass validation with empty body for partial updates', () => {
      const result = validateUpdateTask({});
      expect(result).toBeNull();
    });

    test('should pass validation with valid partial fields', () => {
      expect(validateUpdateTask({ title: 'Updated Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-10-01T00:00:00.000Z' })).toBeNull();
    });

    test('should fail when title is provided as an empty or whitespace string', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    });

    test('should fail when title is not a string', () => {
      expect(validateUpdateTask({ title: 100 })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: false })).toBe('title must be a non-empty string');
    });

    test('should fail when status is invalid', () => {
      const result = validateUpdateTask({ status: 'cancelled' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('should fail when priority is invalid', () => {
      const result = validateUpdateTask({ priority: 'critical' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('should fail when dueDate is not a valid date', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });

    test('should handle null or non-object body without throwing an uncaught exception', () => {
      expect(() => validateUpdateTask(null)).not.toThrow();
      expect(() => validateUpdateTask(undefined)).not.toThrow();
    });
  });

  describe('validateAssignTask', () => {
    test('should pass validation with a valid non-empty assignee string', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
      expect(validateAssignTask({ assignee: 'Bob Smith' })).toBeNull();
    });

    test('should fail when assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    test('should fail when assignee is empty or whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    test('should fail when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: null })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: {} })).toBe('assignee is required and must be a non-empty string');
    });

    test('should handle null, undefined, or non-object body gracefully', () => {
      expect(validateAssignTask(null)).toBe('request body must be a valid JSON object');
      expect(validateAssignTask(undefined)).toBe('request body must be a valid JSON object');
      expect(validateAssignTask([])).toBe('request body must be a valid JSON object');
    });
  });
});

