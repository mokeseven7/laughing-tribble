import * as path from 'path';
import * as apigateway from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { IVpc, InstanceType, SecurityGroup, Port } from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';

/**
 * Construct properties for `ServerlessApi`
 */
export interface ServerlessApiProps {
    /**
     * custom lambda function for the API
     *
     * @default - A Lambda function with Lavavel and Bref support will be created
     */
    readonly handler?: lambda.IFunction;

    /**
     * custom lambda code asset path
     *
     * @default - DEFAULT_LAMBDA_ASSET_PATH
     */
    readonly lambdaCodePath?: string;

    /**
     * AWS Lambda layer version from the Bref runtime.
     * e.g. arn:aws:lambda:us-west-1:209497400698:layer:php-74-fpm:12
     * check the latest runtime verion arn at https://bref.sh/docs/runtimes/
     */
    readonly brefLayerVersion: string;

    /**
     * The VPC for this stack
     */
    readonly vpc?: IVpc;


}

/**
 * Use `ServerlessApi` to create the serverless API resource
 */
export class ServerlessApi extends cdk.Construct {
    readonly handler: lambda.IFunction
    readonly vpc?: IVpc;

    constructor(scope: cdk.Construct, id: string, props: ServerlessApiProps) {
        super(scope, id);

        const DEFAULT_LAMBDA_ASSET_PATH = path.join(__dirname, '../composer/laravel58-bref');

        this.vpc = props.vpc;

        this.handler = props.handler ?? new lambda.Function(this, 'handler', {
            runtime: lambda.Runtime.PROVIDED,
            handler: 'public/index.php',
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(this, 'BrefPHPLayer', props.brefLayerVersion),
            ],
            code: lambda.Code.fromAsset(props?.lambdaCodePath ?? DEFAULT_LAMBDA_ASSET_PATH),
            environment: {
                APP_STORAGE: '/tmp',
            },
            timeout: cdk.Duration.seconds(120),
            vpc: props.vpc,
        });


        const endpoint = new apigateway.HttpApi(this, 'apiservice', {
            defaultIntegration: new LambdaProxyIntegration({
                handler: this.handler,
            }),
        });

        new cdk.CfnOutput(this, 'EndpointURL', { value: endpoint.url! });
    }
}
