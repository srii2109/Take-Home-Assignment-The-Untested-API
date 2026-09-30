const taskService = require('../../src/services/taskService');

describe('TaskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({ title: 'Default Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Default Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
    });

    test('should create a task with custom fields', () => {
      const dueDate = '2026-10-15T10:00:00.000Z';
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.completedAt).toBeNull();
    });
  });

  describe('getAll', () => {
    test('should return an empty array initially', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all.length).toBe(2);
      expect(all[0].title).toBe('Task 1');
      expect(all[1].title).toBe('Task 2');
    });

    test('should return a shallow copy of tasks array so internal array cannot be manipulated directly', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.push({ title: 'Fake Task' });
      expect(taskService.getAll().length).toBe(1);
    });
  });

  describe('findById', () => {
    test('should find a task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('should return undefined if task is not found', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('should return tasks matching the specific status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos.length).toBe(1);
      expect(todos[0].title).toBe('Task 1');

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress.length).toBe(1);
      expect(inProgress[0].title).toBe('Task 2');

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].title).toBe('Task 3');
    });

    test('should only match exact status and not substring matches', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      // 'do' is a substring of both 'todo' and 'done'
      const matched = taskService.getByStatus('do');
      expect(matched.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    test('should return the first page of results (page 1, limit 2)', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 2);
      expect(page1.length).toBe(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    test('should return the second page of results (page 2, limit 2)', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page2 = taskService.getPaginated(2, 2);
      expect(page2.length).toBe(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');
    });

    test('should return the remaining items on the last page', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page3 = taskService.getPaginated(3, 2);
      expect(page3.length).toBe(1);
      expect(page3[0].title).toBe('Task 5');
    });

    test('should return an empty array if page is out of range', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    test('should update specified fields of an existing task', () => {
      const task = taskService.create({ title: 'Original Title', description: 'Original Desc' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        priority: 'high',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('Original Desc'); // Unchanged
    });

    test('should return null when updating a non-existent task', () => {
      const updated = taskService.update('non-existent-id', { title: 'New' });
      expect(updated).toBeNull();
    });

    test('should not allow overwriting task id or createdAt', () => {
      const task = taskService.create({ title: 'Protect ID' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'new-hacked-id',
        createdAt: '2000-01-01T00:00:00.000Z',
        title: 'Updated Title',
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('remove', () => {
    test('should remove an existing task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll().length).toBe(0);
    });

    test('should return false when trying to remove a non-existent task', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('should mark task status as done and set completedAt', () => {
      const task = taskService.create({ title: 'Task to finish', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    test('should preserve existing priority when completing task', () => {
      const task = taskService.create({ title: 'High priority task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    test('should return null when completing a non-existent task', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    test('should return zero counts when there are no tasks', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should accurately calculate status counts and overdue counts', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day future

      taskService.create({ title: 'Todo past due', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'In progress past due', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Todo future', status: 'todo', dueDate: futureDate });
      taskService.create({ title: 'Done past due', status: 'done', dueDate: pastDate }); // Done should not be overdue!

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2); // Only the 2 non-done tasks with past dueDate
    });
  });

  describe('assignTask', () => {
    test('should assign a task to a user', () => {
      const task = taskService.create({ title: 'Task to assign' });
      expect(task.assignee).toBeNull();

      const assigned = taskService.assignTask(task.id, 'John Doe');
      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('John Doe');

      // Verify persistence in task list
      const retrieved = taskService.findById(task.id);
      expect(retrieved.assignee).toBe('John Doe');
    });

    test('should trim whitespace from assignee name', () => {
      const task = taskService.create({ title: 'Task with whitespace assignee' });
      const assigned = taskService.assignTask(task.id, '  Jane Doe  ');
      expect(assigned.assignee).toBe('Jane Doe');
    });

    test('should allow re-assigning a task to another user', () => {
      const task = taskService.create({ title: 'Task to reassign' });
      taskService.assignTask(task.id, 'First Assignee');
      const reassigned = taskService.assignTask(task.id, 'Second Assignee');

      expect(reassigned.assignee).toBe('Second Assignee');
    });

    test('should return null when assigning non-existent task', () => {
      const result = taskService.assignTask('non-existent-id', 'John');
      expect(result).toBeNull();
    });
  });

  describe('_reset', () => {
    test('should clear all tasks in memory', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll().length).toBe(2);

      taskService._reset();
      expect(taskService.getAll().length).toBe(0);
    });
  });
});

