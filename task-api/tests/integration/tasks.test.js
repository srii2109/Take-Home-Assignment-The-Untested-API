const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('should return 200 and an empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    test('should return 200 and all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('should return 500 when an unexpected internal error occurs', async () => {
      const spy = jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('Database failure');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');

      spy.mockRestore();
      consoleSpy.mockRestore();
    });

    test('should filter tasks by status (e.g. ?status=todo)', async () => {

      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[0].status).toBe('todo');
    });

    test('should paginate tasks with page and limit (page=1, limit=2)', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('should return empty array when page number exceeds available tasks', async () => {
      taskService.create({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=10&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should handle default pagination parameters if partially provided', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      // page=1 with default limit 10
      const res = await request(app).get('/tasks?page=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(10);
    });

    test('should allow combining status filtering with pagination', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'todo' });
      taskService.create({ title: 'Task 3', status: 'done' });
      taskService.create({ title: 'Task 4', status: 'todo' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });
  });

  describe('POST /tasks', () => {


    test('should create a new task with valid minimum payload and return 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.createdAt).toBeDefined();
    });

    test('should create a task with all fields provided', async () => {
      const dueDate = '2026-11-20T12:00:00.000Z';
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Full Task',
          description: 'A comprehensive task description',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Full Task');
      expect(res.body.description).toBe('A comprehensive task description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(dueDate);
    });

    test('should return 400 when title is missing or empty', async () => {
      const resEmpty = await request(app)
        .post('/tasks')
        .send({ title: '' });
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toMatch(/title is required/);

      const resMissing = await request(app)
        .post('/tasks')
        .send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toMatch(/title is required/);
    });

    test('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'unknown' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    test('should return 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'super-urgent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    test('should return 400 when dueDate is an invalid date string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'invalid-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date string/);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update an existing task and return 200', async () => {
      const task = taskService.create({ title: 'Before update', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'After update', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('After update');
      expect(res.body.priority).toBe('high');
    });

    test('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('should return 400 when update payload has invalid values', async () => {
      const task = taskService.create({ title: 'Valid task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete an existing task and return 204 No Content', async () => {
      const task = taskService.create({ title: 'To be deleted' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify task is removed
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('should return 404 when trying to delete non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should mark existing task as done with completedAt timestamp and return 200', async () => {
      const task = taskService.create({ title: 'Incomplete task', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.priority).toBe('high'); // Priority should not be reset to 'medium'
    });

    test('should return 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return stats with 0 for all counts when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should return accurate counts for statuses and overdue tasks', async () => {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: yesterday });
      taskService.create({ title: 'Progress on time', status: 'in_progress', dueDate: tomorrow });
      taskService.create({ title: 'Done overdue date', status: 'done', dueDate: yesterday });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1); // Only non-done overdue task
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('should assign an existing task to a user and return 200 with updated task', async () => {
      const task = taskService.create({ title: 'Task to assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Developer' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Jane Developer');

      // Verify persistence via GET /tasks
      const getRes = await request(app).get('/tasks');
      const found = getRes.body.find((t) => t.id === task.id);
      expect(found.assignee).toBe('Jane Developer');
    });

    test('should allow reassigning a task to a different user', async () => {
      const task = taskService.create({ title: 'Task to reassign' });
      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'First Assignee' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Second Assignee' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Second Assignee');
    });

    test('should return 404 when assigning a non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'John' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('should return 400 when assignee is missing or empty string', async () => {
      const task = taskService.create({ title: 'Task 1' });

      const resEmpty = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toMatch(/assignee is required/);

      const resWhitespace = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      expect(resWhitespace.status).toBe(400);
      expect(resWhitespace.body.error).toMatch(/assignee is required/);

      const resMissing = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toMatch(/assignee is required/);
    });

    test('should return 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task 1' });

      const resNumber = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });
      expect(resNumber.status).toBe(400);
      expect(resNumber.body.error).toMatch(/assignee is required/);
    });

    test('should return 400 when request body is empty', async () => {
      const task = taskService.create({ title: 'Task 1' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send(null);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required|request body must be a valid JSON object/);
    });

  });
});

