import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Users
export const getUsers = (params) => api.get('/users/search', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const createUserMultiLabel = (data) => api.post('/users/multi-label', data);
export const updateUserProperties = (id, data) => api.patch(`/users/${id}/properties`, data);
export const updateUserPropertiesBatch = (data) => api.patch('/users/properties/batch', data);
export const deleteUserProperties = (id, data) => api.delete(`/users/${id}/properties`, { data });
export const deleteUserPropertiesBatch = (data) => api.delete('/users/properties/batch', { data });
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const deleteUsersBatch = (data) => api.delete('/users/batch', { data });
export const getUsersAggregate = () => api.get('/users/aggregate');

// Posts
export const getPosts = (params) => api.get('/posts/search', { params });
export const getPost = (id) => api.get(`/posts/${id}`);
export const createPost = (data) => api.post('/posts', data);
export const createPostMultiLabel = (data) => api.post('/posts/multi-label', data);
export const updatePostProperties = (id, data) => api.patch(`/posts/${id}/properties`, data);
export const updatePostPropertiesBatch = (data) => api.patch('/posts/properties/batch', data);
export const deletePostProperties = (id, data) => api.delete(`/posts/${id}/properties`, { data });
export const deletePostPropertiesBatch = (data) => api.delete('/posts/properties/batch', { data });
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const deletePostsBatch = (data) => api.delete('/posts/batch', { data });
export const getPostsAggregate = () => api.get('/posts/aggregate');

// Communities
export const getCommunities = (params) => api.get('/communities/search', { params });
export const getCommunity = (id) => api.get(`/communities/${id}`);
export const createCommunity = (data) => api.post('/communities', data);
export const createCommunityMultiLabel = (data) => api.post('/communities/multi-label', data);
export const updateCommunityProperties = (id, data) => api.patch(`/communities/${id}/properties`, data);
export const updateCommunityPropertiesBatch = (data) => api.patch('/communities/properties/batch', data);
export const deleteCommunityProperties = (id, data) => api.delete(`/communities/${id}/properties`, { data });
export const deleteCommunityPropertiesBatch = (data) => api.delete('/communities/properties/batch', { data });
export const deleteCommunity = (id) => api.delete(`/communities/${id}`);
export const deleteCommunitiesBatch = (data) => api.delete('/communities/batch', { data });
export const getCommunitiesAggregate = () => api.get('/communities/aggregate');

// Games
export const getGames = (params) => api.get('/games/search', { params });
export const getGame = (id) => api.get(`/games/${id}`);
export const createGame = (data) => api.post('/games', data);
export const createGameMultiLabel = (data) => api.post('/games/multi-label', data);
export const updateGameProperties = (id, data) => api.patch(`/games/${id}/properties`, data);
export const updateGamePropertiesBatch = (data) => api.patch('/games/properties/batch', data);
export const deleteGameProperties = (id, data) => api.delete(`/games/${id}/properties`, { data });
export const deleteGamePropertiesBatch = (data) => api.delete('/games/properties/batch', { data });
export const deleteGame = (id) => api.delete(`/games/${id}`);
export const deleteGamesBatch = (data) => api.delete('/games/batch', { data });
export const getGamesAggregate = () => api.get('/games/aggregate');

// Tags
export const getTags = (params) => api.get('/tags/search', { params });
export const getTag = (id) => api.get(`/tags/${id}`);
export const createTag = (data) => api.post('/tags', data);
export const createTagMultiLabel = (data) => api.post('/tags/multi-label', data);
export const updateTagProperties = (id, data) => api.patch(`/tags/${id}/properties`, data);
export const updateTagPropertiesBatch = (data) => api.patch('/tags/properties/batch', data);
export const deleteTagProperties = (id, data) => api.delete(`/tags/${id}/properties`, { data });
export const deleteTagPropertiesBatch = (data) => api.delete('/tags/properties/batch', { data });
export const deleteTag = (id) => api.delete(`/tags/${id}`);
export const deleteTagsBatch = (data) => api.delete('/tags/batch', { data });
export const getTagsAggregate = () => api.get('/tags/aggregate');

// Awards
export const getAwards = (params) => api.get('/awards/search', { params });
export const getAward = (id) => api.get(`/awards/${id}`);
export const createAward = (data) => api.post('/awards', data);
export const createAwardMultiLabel = (data) => api.post('/awards/multi-label', data);
export const updateAwardProperties = (id, data) => api.patch(`/awards/${id}/properties`, data);
export const updateAwardPropertiesBatch = (data) => api.patch('/awards/properties/batch', data);
export const deleteAwardProperties = (id, data) => api.delete(`/awards/${id}/properties`, { data });
export const deleteAwardPropertiesBatch = (data) => api.delete('/awards/properties/batch', { data });
export const deleteAward = (id) => api.delete(`/awards/${id}`);
export const deleteAwardsBatch = (data) => api.delete('/awards/batch', { data });
export const getAwardsAggregate = () => api.get('/awards/aggregate');

// Relationships
export const getRelationships = (params) => api.get('/relationships', { params });
export const createRelationship = (data) => api.post('/relationships', data);
export const updateRelProperties = (data) => api.patch('/relationships/properties', data);
export const updateRelPropertiesBatch = (data) => api.patch('/relationships/properties/batch', data);
export const deleteRelProperties = (data) => api.delete('/relationships/properties', { data });
export const deleteRelPropertiesBatch = (data) => api.delete('/relationships/properties/batch', { data });
export const deleteRelationship = (data) => api.delete('/relationships/single', { data });
export const deleteRelationshipsBatch = (data) => api.delete('/relationships/batch', { data });

// Queries
export const queryTopPosts = (params) => api.get('/queries/top-posts-by-game', { params });
export const querySuggestedUsers = (params) => api.get('/queries/suggested-users', { params });
export const queryActiveCommunities = () => api.get('/queries/active-communities');
export const queryGameCommunityStats = () => api.get('/queries/game-community-stats');
export const queryShortestPath = (params) => api.get('/queries/shortest-path', { params });
export const queryRareAwardPosts = () => api.get('/queries/rare-award-posts');

// Graph
export const getSubgraph = (params) => api.get('/graph/subgraph', { params });
export const getGraphOverview = (params) => api.get('/graph/overview', { params });

// GDS
export const getPageRank = (params) => api.get('/gds/pagerank', { params });
export const getLouvain = () => api.get('/gds/louvain');
export const getShortestPathGDS = (params) => api.get('/gds/shortest-path', { params });

// CSV
export const uploadNodesCSV = (formData) => api.post('/csv/upload/nodes', formData);
export const uploadRelationshipsCSV = (formData) => api.post('/csv/upload/relationships', formData);

// Health
export const healthCheck = () => api.get('/health');

export default api;
