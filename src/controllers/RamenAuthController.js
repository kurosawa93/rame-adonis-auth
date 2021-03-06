'use strict'

const AuthUtil = require('../utils/RamenAuthUtil')
const TokenUtil = require('../utils/RamenTokenUtil')
const Config = use('Adonis/Src/Config')

class AuthController {
    constructor(model, defaultRole = null) {
        this.model = model
        this.defaultRole = defaultRole
    }

    async login({request, auth, response}) {
        const relations = request.input('relations')
        const email = request.body.email
        const password = request.body.password
        const account = await AuthUtil.basicAuthenticate(auth, this.model, email, password)
        if (relations) {
            const relationArr = relations.split(',')
            for (const relation of relationArr) {
                await account.load(relation)
            }
        }
        
        return response.status(200).send({
            data: account,
            meta: {
                message: 'login is successfull'
            }
        })
    }

    async aesLogin({request, auth, response}) {
        const relations = request.input('relations')
        const decrypted = AuthUtil.decodePayload(Config._config.ramenauth.aesKey, request.body.payload)
        const account = await AuthUtil.basicAuthenticate(auth, this.model, decrypted.email, decrypted.password)
        if (relations) {
            const relationArr = relations.split(',')
            for (const relation of relationArr) {
                await account.load(relation)
            }
        }

        return response.status(200).send({
            data: account,
            meta: {
                message: 'login is successfull'
            }
        })
    }

    async register({request, auth, response}) {
        const data = request.body
        if (this.defaultRole && !data['roles']) {
            data['roles'] = this.defaultRole
        }

        const account = await this.model.createObject(request.body)
        const credentials = await TokenUtil.generateAuthToken(auth, account.data)
        
        account.data.token = credentials.token
        account.data.refresh_token = credentials.refreshToken
        return response.status(200).send({
            data: account.data,
            meta: {
                message: 'register is successfull'
            }
        })
    }

    async aesRegister({request, auth, response}) {
        const decrypted = AuthUtil.decodePayload(Config._config.ramenauth.aesKey, request.body.payload)
        if (this.defaultRole && !decrypted['roles']) {
            decrypted['roles'] = this.defaultRole
        }

        const account = await this.model.createObject(decrypted)
        const credentials = await TokenUtil.generateAuthToken(auth, account.data)

        account.data.token = credentials.token
        account.data.refresh_token = credentials.refreshToken
        return response.status(200).send({
            data: account.data,
            meta: {
                message: 'register is successfull'
            }
        })
    }

    async refreshToken({request, response, auth}) {
        const refreshToken = request.body.refresh_token
        const credentials = await auth.newRefreshToken().generateForRefreshToken(refreshToken)
        return response.status(200).send({
            data: {
                token: credentials.token,
                refresh_token: credentials.refreshToken
            },
            meta: {
                message: 'token refreshed'
            }
        })
    }

    async updatePassword({request, response}) {
        const createdBy = request.body.created_by
        const oldPassword = request.body.old_password
        const newPassword = request.body.new_password
        const result = await AuthUtil.changePassword(this.model, createdBy.id, oldPassword, newPassword)
        return response.status(200).send({
            data: result,
            meta: {
                message: 'change password is successfull'
            }
        })
    }

    async aesUpdatePassword({request, response}) {
        const createdBy = request.body.created_by
        const decrypted = AuthUtil.decodePayload(Config._config.ramenauth.aesKey, request.body.payload)
        const result = await AuthUtil.changePassword(this.model, createdBy.id, decrypted.old_password, decrypted.new_password)
        return response.status(200).send({
            data: result,
            meta: {
                message: 'change password is successfull'
            }
        })
    }

    async verify({request, auth, response}) {
        const token = request.body.token
        const claim = request.body.claim
        const decodedToken = TokenUtil.decodeToken(token)
        if (decodedToken.error.message != null) {
            return response.status(403).send({
                data: null,
                meta: {
                    message: decodedToken.error.message
                }
            })
        }
        const account = await AuthUtil.validateClaim(decodedToken.data.uid, claim, this.model)
        if (account == null) {
            return response.status(403).send({
                data: null,
                meta: {
                    message: 'You\'re not authorized'
                }
            })
        }
        return response.status(200).send({
            data: account,
            meta: {
                message: 'Authorized'
            }
        })
    }
}

module.exports = AuthController
