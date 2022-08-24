import {ConsumeMessage} from 'amqplib';
import {randomUUID} from 'crypto';
import {EventTypes, Listener} from 'flaky-common';
import {createClient} from 'redis';
import * as k8s from '@kubernetes/client-node';

interface ProjectTestEvent {
  eventType: EventTypes.ProjectReady;
  data: {
    redisProjectListName: string;
  };
}

const clusters: Array<k8s.Cluster> = [
  {
    name: 'flaky-infrastructure',
    server: 'https://172.16.97.200/k8s/clusters/c-zktsx',
    caData:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJwekNDQ\
    VUyZ0F3SUJBZ0lCQURBS0JnZ3Foa2pPUFFRREFqQTdNUnd3R2dZRFZRUUtFeE5rZVc1aGJXbGoKY\
    kdsemRHVnVaWEl0YjNKbk1Sc3dHUVlEVlFRREV4SmtlVzVoYldsamJHbHpkR1Z1WlhJdFkyRXdIa\
    GNOTWpJdwpOekV6TVRreE16QTJXaGNOTXpJd056RXdNVGt4TXpBMldqQTdNUnd3R2dZRFZRUUtFe\
    E5rZVc1aGJXbGpiR2x6CmRHVnVaWEl0YjNKbk1Sc3dHUVlEVlFRREV4SmtlVzVoYldsamJHbHpkR\
    1Z1WlhJdFkyRXdXVEFUQmdjcWhrak8KUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVRKSldUWWhGeTQzc\
    HZpWmxKa0hocmFjM0NZcjZxeU0zWjdTNnhQcDBaaApzQ25zN2YrbnczSDJTbFZUM0c2a1JtTjM3Z\
    1p5aWtseDFxOXdsZVRTMVFoOW8wSXdRREFPQmdOVkhROEJBZjhFCkJBTUNBcVF3RHdZRFZSMFRBU\
    UgvQkFVd0F3RUIvekFkQmdOVkhRNEVGZ1FVeGxVeFlLOHJ2QjFTQlhhaWs2RjEKNmZsZytQOHdDZ\
    1lJS29aSXpqMEVBd0lEU0FBd1JRSWhBTkJDUTBOZGdrWkdKWnpiZE5ud0VCS1NiVG1yRjVnYQpvS\
    Go5NktoY2pxNnVBaUFhSXhDYU9tV3VSelNDSm9tYi9jZ2lZQjJHQ3p2SE8vRzRFT3NqT2w4MTJ3P\
    T0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ==',
    skipTLSVerify: false,
  },
  {
    name: 'flaky-infrastructure-flakymaster1',
    server: 'https://172.16.97.201:6443',
    caData:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUM0VENDQ\
    WNtZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFTTVJBd0RnWURWUVFERXdkcmRXSmwKT\
    FdOaE1CNFhEVEl5TURjeE16RTVNVGt6T1ZvWERUTXlNRGN4TURFNU1Ua3pPVm93RWpFUU1BNEdBM\
    VVFQXhNSAphM1ZpWlMxallUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ\
    0VCQU5BTzc1WHJjVklnCkVTdW1OdGhZQzQ1ZHRPUkpCM3Y4TlNZS1VWSHB0YjIwSTJpdUtVYVlmM\
    zVWNjlEczhpU3ZvTUNlQVo1SkNtalkKMWFhWWZEMGZucDM2ckJETkVYLzIrVHZ6MHBmVWQ3Z0dvK\
    0x2Q3c0cEV4cWJDcG5HZkZsT1Bha1RDeG4vR1JmdApoMEVRaTJaZ2h0MzA4MmY2UE81ZmdpS01XM\
    WRxOHcrUVhKb2tndUkzYnJuZWthUzFEME5YSWVhN3BHT0tibDh4CnJVZ3hYUzg3SnpHUEgwTkVpO\
    XowMWI0YVZOVHZ1V2ZXVFFzcTY3SklhclN5ajZBa292RGRSaFVBQ1FnM0pDUHEKRzd1YzAwMExqN\
    W9RSUEycHZOWWdkUmJCY2NtSTc5cE9pZ0lGeDhjempYbjBYK0xxa1ZHSlVjMFhDS3U2dFV1OQpmd\
    llycWg4Y21wVUNBd0VBQWFOQ01FQXdEZ1lEVlIwUEFRSC9CQVFEQWdLa01BOEdBMVVkRXdFQi93U\
    UZNQU1CCkFmOHdIUVlEVlIwT0JCWUVGS2JsdlZ3elQ1bWx6QXFyciszVDFEM0pVdU4vTUEwR0NTc\
    UdTSWIzRFFFQkN3VUEKQTRJQkFRQ09TSmtpeU95Tmd4SEc4MkI4MXcxYk0xL3M4bU1WMFR3QUZRN\
    FhYKy8zZEpaMElmYWpyV1JvOG1LaApsbmEwZmRkQzNtU0t1S3ErR1NnWHlKQWdXRXN6RzNHMmdDR\
    3B3SVkyZ3RPOTZYSkc2RzJyYkl5bXFsM3J2ZjRpCkNwUWVoY2JicUxyZS9QcTBRbnJhdERpK2p5N\
    2phb3ByeXFSRFVWUXhsL0tIM1NpNXJ3SFVDM05VY0xCUmUwS2EKNzB1WnhDTmdoVWNWeWI5VE9ta\
    zVBdTJ1SkZlVmpEM0Q5TDFMcjhrcUh3ODRBSjdOc21kd0lIMGlxOENsMUx6OApFSjZ3SGZpQTBXT\
    jRGUWY4ZmpUR1EzRmtmT2JDZlU0RGxvVy81RkpKOWNJQldkK1VIbU9YRitFNVIzUDhFZzJ5CkxQV\
    EhjQ295RWZ0UXRjRytxR25nTlNvcWwzYS8KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
    skipTLSVerify: false,
  },
  {
    name: 'flaky-infrastructure-flakymaster2',
    server: 'https://172.16.97.202:6443',
    caData:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUM0VENDQ\
    WNtZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFTTVJBd0RnWURWUVFERXdkcmRXSmwKT\
    FdOaE1CNFhEVEl5TURjeE16RTVNVGt6T1ZvWERUTXlNRGN4TURFNU1Ua3pPVm93RWpFUU1BNEdBM\
    VVFQXhNSAphM1ZpWlMxallUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ\
    0VCQU5BTzc1WHJjVklnCkVTdW1OdGhZQzQ1ZHRPUkpCM3Y4TlNZS1VWSHB0YjIwSTJpdUtVYVlmM\
    zVWNjlEczhpU3ZvTUNlQVo1SkNtalkKMWFhWWZEMGZucDM2ckJETkVYLzIrVHZ6MHBmVWQ3Z0dvK\
    0x2Q3c0cEV4cWJDcG5HZkZsT1Bha1RDeG4vR1JmdApoMEVRaTJaZ2h0MzA4MmY2UE81ZmdpS01XM\
    WRxOHcrUVhKb2tndUkzYnJuZWthUzFEME5YSWVhN3BHT0tibDh4CnJVZ3hYUzg3SnpHUEgwTkVpO\
    XowMWI0YVZOVHZ1V2ZXVFFzcTY3SklhclN5ajZBa292RGRSaFVBQ1FnM0pDUHEKRzd1YzAwMExqN\
    W9RSUEycHZOWWdkUmJCY2NtSTc5cE9pZ0lGeDhjempYbjBYK0xxa1ZHSlVjMFhDS3U2dFV1OQpmd\
    llycWg4Y21wVUNBd0VBQWFOQ01FQXdEZ1lEVlIwUEFRSC9CQVFEQWdLa01BOEdBMVVkRXdFQi93U\
    UZNQU1CCkFmOHdIUVlEVlIwT0JCWUVGS2JsdlZ3elQ1bWx6QXFyciszVDFEM0pVdU4vTUEwR0NTc\
    UdTSWIzRFFFQkN3VUEKQTRJQkFRQ09TSmtpeU95Tmd4SEc4MkI4MXcxYk0xL3M4bU1WMFR3QUZRN\
    FhYKy8zZEpaMElmYWpyV1JvOG1LaApsbmEwZmRkQzNtU0t1S3ErR1NnWHlKQWdXRXN6RzNHMmdDR\
    3B3SVkyZ3RPOTZYSkc2RzJyYkl5bXFsM3J2ZjRpCkNwUWVoY2JicUxyZS9QcTBRbnJhdERpK2p5N\
    2phb3ByeXFSRFVWUXhsL0tIM1NpNXJ3SFVDM05VY0xCUmUwS2EKNzB1WnhDTmdoVWNWeWI5VE9ta\
    zVBdTJ1SkZlVmpEM0Q5TDFMcjhrcUh3ODRBSjdOc21kd0lIMGlxOENsMUx6OApFSjZ3SGZpQTBXT\
    jRGUWY4ZmpUR1EzRmtmT2JDZlU0RGxvVy81RkpKOWNJQldkK1VIbU9YRitFNVIzUDhFZzJ5CkxQV\
    EhjQ295RWZ0UXRjRytxR25nTlNvcWwzYS8KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
    skipTLSVerify: false,
  },
];

const users: Array<k8s.User> = [
  {
    name: 'flaky-infrastructure',
    token:
      'kubeconfig-user-mfsbnw2rcg:9j25fsw5sr9thnxpxlvk8pssm5sx85lnbvf8xntdjsbmsnnx6ngg46',
  },
];

const contexts = [
  {
    name: 'flaky-infrastructure',
    user: 'flaky-infrastructure',
    cluster: 'flaky-infrastructure',
  },
  {
    name: 'flaky-infrastructure-flakymaster1',
    user: 'flaky-infrastructure',
    cluster: 'flaky-infrastructure-flakymaster1',
  },
  {
    name: 'flaky-infrastructure-flakymaster2',
    user: 'flaky-infrastructure',
    cluster: 'flaky-infrastructure-flakymaster2',
  },
];

const kc = new k8s.KubeConfig();
kc.loadFromOptions({
  clusters,
  users,
  contexts,
  currentContext: 'flaky-infrastructure',
});

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const watch = new k8s.Watch(kc);

(async () => {
  const listFn = () => k8sApi.listNamespacedPod('default');

  const informer = k8s.makeInformer(
    kc,
    '/api/v1/namespaces/default/pods',
    listFn
  );

  informer.on('update', async (obj: k8s.V1Pod) => {
    if (
      (obj.status?.phase == 'Succeeded' || obj.status?.phase == 'Failed') &&
      !obj.metadata?.deletionTimestamp
    ) {
      await runPod();
      await k8sApi.deleteNamespacedPod(obj.metadata!.name!, 'default');
    }
  });

  informer.start();
})();

// watch.watch(
//   '/api/v1/pods',
//   {},
//   async (type, apiObj: k8s.V1Pod, watchObj) => {
//     console.log(watchObj);
//     if (
//       type === 'MODIFIED' &&
//       (apiObj.status?.phase == 'Succeeded' ||
//         apiObj.status?.phase == 'Failed') &&
//       !apiObj.metadata?.deletionTimestamp
//     ) {
//       await runPod();
//       await k8sApi.deleteNamespacedPod(apiObj.metadata!.name!, 'default');
//     }
//   },
//   err => {
//     console.log('Failure in watching: ', err);
//   }
// );

async function runPod() {
  const client = createClient({url: process.env.FLAKY_REDIS_URI});
  await client.connect();

  const redisLRangeRes = await client.lRange('runTestQueue', 0, 0);
  if (redisLRangeRes.length === 0) {
    return;
  }
  const testToRun = JSON.parse(redisLRangeRes[0]);
  const resources: k8s.V1ResourceRequirements = {limits: {}};
  const envVariables: Array<k8s.V1EnvVar> = [];
  envVariables.push({
    name: 'FLAKY_RUN_NUMBER',
    value: testToRun.numberOfRuns,
  });

  envVariables.push({
    name: 'FLAKY_SCENARIOS_NUMBER',
    value: testToRun.numberOfScenarios,
  });

  envVariables.push({
    name: 'FLAKY_TEST_ID',
    value: testToRun.testMethodName,
  });

  envVariables.push({
    name: 'FLAKY_PROJECT_ID',
    value: testToRun.projectId,
  });

  envVariables.push({
    name: 'FLAKY_TEST_RUN_ID',
    value: testToRun.testRunId,
  });

  envVariables.push({
    name: 'FLAKY_MODULE_NAME',
    value: testToRun.moduleName,
  });

  envVariables.push({
    name: 'FLAKY_CONFIG_FILE',
    value: testToRun.configFile,
  });

  envVariables.push({
    name: 'FLAKY_CONFIGURATION',
    value: JSON.stringify(testToRun.scenarioConfiguration),
  });

  envVariables.push({
    name: 'FLAKY_IS_LAST_CONFIG',
    value: testToRun.isLastConfig.toString(),
  });

  envVariables.push({
    name: 'FLAKY_RABBITMQ_URI',
    value: process.env.FLAKY_RABBITMQ_URI,
  });

  envVariables.push({
    name: 'FLAKY_RABBITMQ_USERNAME',
    value: process.env.FLAKY_RABBITMQ_USERNAME,
  });

  envVariables.push({
    name: 'FLAKY_RABBITMQ_PASSWORD',
    value: process.env.FLAKY_RABBITMQ_PASSWORD,
  });

  if ('concurrency' in testToRun.scenarioConfiguration) {
    resources.limits!['cpu'] =
      testToRun.scenarioConfiguration.concurrency.cpuNumber;
    envVariables.push({
      name: 'FLAKY_CPU_LOAD',
      value: testToRun.scenarioConfiguration.concurrency.cpuLoad,
    });
  }
  if ('memory' in testToRun.scenarioConfiguration) {
    resources.limits!['memory'] = '16G';
    envVariables.push({
      name: 'MAVEN_OPTS',
      value: `-Xms${testToRun.scenarioConfiguration.memory.memorySize}m -Xmx${testToRun.scenarioConfiguration.memory.memorySize}m`,
    });
    envVariables.push({
      name: 'FLAKY_MEMORY_LOAD',
      value: testToRun.scenarioConfiguration.memory.memoryLoad,
    });
  }
  if ('diskio' in testToRun.scenarioConfiguration) {
    resources.limits!['ephemeral-storage'] =
      testToRun.scenarioConfiguration.diskio.diskSize + 'M';
    envVariables.push({
      name: 'FLAKY_DISK_INPUT_LOAD',
      value: testToRun.scenarioConfiguration.diskio.diskLoad,
    });
    envVariables.push({
      name: 'FLAKY_DISK_OUTPUT_LOAD',
      value: testToRun.scenarioConfiguration.diskio.diskLoad,
    });
  }
  if ('order' in testToRun.scenarioConfiguration) {
    // envVariables.push({
    //   name: 'FLAKY_RANDOM_SEED',
    //   value: testToRun.scenarioConfiguration.order.randomSeed,
    // });
    envVariables.push({
      name: 'FLAKY_TEST_ORDER',
      value: 'true',
    });
  }

  const name = `${
    testToRun.imageName.split('/')[1].split('-')[0].split(':')[0]
  }-${randomUUID()}`;

  const createPodResult = await k8sApi.createNamespacedPod('default', {
    metadata: {
      name,
      namespace: 'default',
      labels: {
        app: 'FLAKY_RUNNING_TEST_POD',
      },
    },
    spec: {
      restartPolicy: 'Never',
      tolerations: [
        {
          key: 'dedicated',
          operator: 'Equal',
          value: 'tests',
          effect: 'NoSchedule',
        },
      ],
      imagePullSecrets: [
        {
          name: 'flaky-registry',
        },
      ],
      containers: [
        {
          name,
          image: testToRun.imageName,
          resources,
          env: envVariables,
          imagePullPolicy: 'Always',
        },
      ],
    },
  });

  await client.lPop('runTestQueue');
  await client.quit();
}

export class ProjectTestListener extends Listener<ProjectTestEvent> {
  eventType: EventTypes.ProjectReady = EventTypes.ProjectReady;
  queueName = `tests-executor/project-test-${randomUUID()}`;
  routingKey = 'project.test';

  async onMessage(data: ProjectTestEvent['data'], msg: ConsumeMessage) {
    try {
      await runPod();
    } catch (err: any) {
      console.log(err);
      throw err;
    }
  }
}
