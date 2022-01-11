import Stripe from '@ioc:Adonis/Addons/Stripe'
import Env from '@ioc:Adonis/Core/Env'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Plan from 'App/Models/Plan'
import User from 'App/Models/User'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import { Stripe as StripeType } from 'stripe'

export default class PaymentsController {
  public async createPortalSession({ response, auth }: HttpContextContract) {
    const user = auth.user!
    if (!user.stripeCustomerId) {
      return response.format(500, 'You must have a subscription to create a session')
    }
    const session = await Stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: Env.get('CLIENT_URL') + '/dashboard/billing',
    })

    return response.format(200, {
      url: session.url,
    })
  }

  public async createCheckoutSession({ request, response, auth }: HttpContextContract) {
    const user = auth.user!
    const data = await request.validate({
      schema: schema.create({
        plan: schema.string(),
      }),
      reporter: CustomReporter,
    })

    const plan = await Plan.findBy('slug', data.plan)
    if (!plan) {
      return response.format(404, 'Plan not found')
    }

    // Set free plan if user doesn't habve a subscription
    if (user.planId === null) {
      const free = await Plan.findBy('slug', 'free')
      if (!free) {
        return response.format(500, 'Plan not found')
      }
      user.planId = free?.id
      await user.save()
    }

    await user.load('plan')

    if (user.planId == plan.id) {
      return response.format(400, 'You already have this plan')
    }

    if (user.plan.slug !== 'free' && user.stripeSubscriptionId) {
      // Cancel Plan
      if (plan.slug === 'free') {
        await Stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        })
        return response.format(200, 'Cancelled subscription successfully.')
      } else {
        // Upgrade or downgrade plan
        const subscription = await Stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        if (subscription.status !== 'active') {
          return response.format(500, 'Failed to modify subscription')
        }

        const newSubscription = await Stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: false,
          proration_behavior: 'create_prorations',
          items: [
            {
              id: subscription.items.data[0].id,
              plan: plan.stripePriceId,
            },
          ],
        })

        if (newSubscription.status !== 'active') {
          return response.format(500, 'Failed to modify subscription')
        }

        user.planId = plan.id
        await user.save()
      }

      return response.format(200, 'Plan updated')
    }

    // Create new subscription
    if (!user.stripeCustomerId) {
      const customer = await Stripe.customers.create({
        name: user.name,
        email: user.email,
      })

      user.stripeCustomerId = customer.id
      await user.save()
    }

    try {
      const session = await Stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: Env.get('CLIENT_URL') + '/dashboard/billing',
        cancel_url: Env.get('CLIENT_URL') + '/dashboard/billing',
      })
      return response.format(200, {
        url: session.url,
      })
    } catch (error) {
      return response.format(500, 'Failed to create checkout session')
    }
  }

  public async stripeWebhook({ request, response }: HttpContextContract) {
    const sig = request.header('stripe-signature')

    try {
      const event = await Stripe.webhooks.constructEvent(
        request.raw() as string,
        sig as string,
        Env.get('STRIPE_WEBHOOK_KEY')
      )
      if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as StripeType.Subscription
        const user = await User.findBy('stripe_customer_id', subscription.customer)
        const plan = await Plan.findBy('stripe_price_id', subscription.items.data[0].price.id)
        if (user && plan) {
          user.planId = plan.id
          user.stripeSubscriptionId = subscription.id
          await user.save()
        } else {
          console.log('Failed to update user plan')
        }
        return response.format(200, 'Webhook received')
      } else if (event.type == 'customer.subscription.deleted') {
        const subscription = event.data.object as StripeType.Subscription
        const user = await User.findBy('stripe_subscription_id', subscription.id)
        if (user) {
          user.planId = null
        }
        return response.format(200, 'Webhook received')
      } else {
        return response.format(200, 'Webhook received')
      }
    } catch (error) {
      console.log(error)
      return response.format(500, 'Failed to validate webhook')
    }
  }
}
