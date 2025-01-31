import { cliArguments } from 'cli-argument-parser';
import { expect } from 'chai'
import { RedisGraph } from '../modules/redisgraph/redisgraph';
import { RedisModules } from '../modules/redis-modules';
import { GraphConfigInfo } from '../modules/redisgraph/redisgraph.types';
let client: RedisGraph;
let redis: RedisModules;
const graphName = 'Test'

describe('RedisGraph Module testing', async function() {
    this.timeout(10 * 60 * 60);
    before(async () => {
        client = new RedisGraph({
            host: cliArguments.host,
            port: parseInt(cliArguments.port),
        }, { showDebugLogs: true });
        redis = new RedisModules({
            host: cliArguments.host,
            port: parseInt(cliArguments.port),
        });
        await client.connect();
        await redis.connect();
    })
    after(async () => {
        await client.disconnect();
        await redis.disconnect();
    })

    it('query function', async () => {
        let response = await client.query(graphName, 'CREATE (p:Person {name: \'Kurt\', age: 27}) RETURN p');
        expect(response[2].find(item => item === 'Labels added: 1')).to.not.equal(undefined, 'The value of Labels added');
        expect(response[2].find(item => item === 'Nodes created: 1')).to.not.equal(undefined, 'The value of Nodes created');
        expect(response[2].find(item => item === 'Properties set: 2')).to.not.equal(undefined, 'The value of Properties set');
        expect(response[2].find(item => item === 'Cached execution: 0')).to.not.equal(undefined, 'The value of Cached execution');
        response = await client.query(graphName, `MATCH (p:Person) WHERE p.name=$name RETURN count(p) as count`, { name: 'Kurt'});
        expect(response[2].find(item => item === 'Cached execution: 0')).to.not.equal(undefined, 'The response of the GRAPH.QUERY command');
    });
    it('readonlyQuery function', async () => {
        let response = await client.readonlyQuery(graphName, 'MATCH (p:Person) WHERE p.age > 80 RETURN p');
        expect(response[2][0]).to.equal('Cached execution: 0', 'The response of the GRAPH.RO_QUERY command');
        response = await client.readonlyQuery(graphName, 'MATCH (p:Person) WHERE p.age > $age RETURN p', { age: '80' });
        expect(response[2][0]).to.equal('Cached execution: 0', 'The response of the GRAPH.RO_QUERY command');
    });
    it('profile function', async () => {
        const response = await client.profile(graphName, 'MATCH (p:Person) WHERE p.age > 80 RETURN p');
        expect(response[0]).to.contain('Results | Records produced: 0', 'The response of the GRAPH.QUERY command');
    });
    it('explain function', async () => {
        const response = await client.explain(graphName, 'MATCH (p:Person) WHERE p.age > 80 RETURN p');
        expect(response[0]).to.equal('Results', 'The response of the GRAPH.EXPLAIN command');
        expect(response[1]).to.contain('Project', 'The response of the GRAPH.EXPLAIN command');
        expect(response[2]).to.contain('Filter', 'The response of the GRAPH.EXPLAIN command');
        expect(response[3]).to.contain('Node By Label Scan | (p:Person)', 'The response of the GRAPH.EXPLAIN command');
    });
    it.skip('slowlog function', async () => {
        const response = await client.slowlog(1)
        expect(response.length).to.equal(0, 'The response of the GRAPH.SLOWLOG command');
    });
    it('delete function', async () => {
        const response = await client.delete(graphName)
        expect(response).to.contain('Graph removed', 'The response of the GRAPH.DELETE command');
    });
    it('config function', async () => {
        const response = await client.config('SET', 'RESULTSET_SIZE', '1000');
        expect(response).to.eql('OK', 'The RESULT SET SIZE');
        let response2 = await client.config('GET', 'RESULTSET_SIZE') as GraphConfigInfo;
        expect(response2.RESULTSET_SIZE).to.eql(1000, 'The RESULT SET SIZE');
        response2 = await client.config('GET', '*') as GraphConfigInfo;
        expect(response2.CACHE_SIZE).to.eql(25, 'The CACHE_SIZE of the module');
    });
});